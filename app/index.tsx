import { makeRedirectUri } from 'expo-auth-session';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useRef, useState } from 'react';
import { Button, Image, StyleSheet } from 'react-native';
import { Account, Channel, Client, ID, Models, OAuthProvider, Permission, RealtimeResponseEvent, Role, Storage, TablesDB } from 'react-native-appwrite';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

const client = new Client()
  .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT!)
  .setPlatform(process.env.EXPO_PUBLIC_APPWRITE_PLATFORM!);
const account = new Account(client);
const storage = new Storage(client);
const tablesDB = new TablesDB(client);

export default function HomeScreen() {
  const [user, setUser] = useState<Models.User<Models.Preferences>>();
  const [event, setEvent] = useState<RealtimeResponseEvent<unknown>>();
  const [row, setRow] = useState<Models.Row>();
  const [file, setFile] = useState<Models.File>();
  const [subscribed, setSubscribed] = useState(false);
  const unsubscribeFromEvents = useRef<(() => void) | null>(null);

  let createSession = async () => {
    try {
      await account.createEmailPasswordSession({
        email: process.env.EXPO_PUBLIC_APPWRITE_USER_EMAIL!,
        password: process.env.EXPO_PUBLIC_APPWRITE_USER_PASS!,
      });
      getAccount();
    } catch (e) {
      console.log(e);

    }
  }

  let createAnonymousSession = async () => {
    await account.createAnonymousSession();
    getAccount();
  }

  let createOAuth2Session = async (provider: OAuthProvider) => {
    try {
      // REQUIRED
      // Make sure your scheme is set to appwrite-callback-<PROJECT_ID> in your app.json

      // Create deep link that works across Expo environments
      // Ensure localhost is used for the hostname to validation error for success/failure URLs
      const deepLink = new URL(makeRedirectUri({ preferLocalhost: true }));
      const scheme = `${deepLink.protocol}//`; // e.g. 'exp://' or 'appwrite-callback-<PROJECT_ID>://'

      console.log('Using deep link:', deepLink.href);

      // Start OAuth flow
      const loginUrl = await account.createOAuth2Token({
        provider,
        success: `${deepLink}`,
        failure: `${deepLink}`,
      });

      console.log('OAuth login URL:', loginUrl);

      // Open loginUrl and listen for the scheme redirect
      const result = await WebBrowser.openAuthSessionAsync(`${loginUrl}`, scheme);

      console.log('OAuth result:', result);

      if (result.type !== 'success') {
        // Handle the case where the user cancelled the login or an error occurred
        console.error('OAuth login failed:', result);
        return;
      }

      // Extract credentials from OAuth redirect URL
      const url = new URL(result?.url || '');
      const secret = url.searchParams.get('secret');
      const userId = url.searchParams.get('userId');

      // Create session with OAuth credentials
      await account.createSession({ userId: userId!, secret: secret! });
      await getAccount(); // get user, set state, and redirect as needed
    } catch (e) {
      console.log(e);
    }
  }

  let createRow = async () => {
    try {
      const row = await tablesDB.createRow({
        databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE!,
        tableId: process.env.EXPO_PUBLIC_APPWRITE_TABLE!,
        rowId: ID.unique(),
        data: {
          username: 'test'
        },
        permissions: [
          Permission.read(Role.any()),
          Permission.write(Role.any())
        ]
      });
      setRow(row);
    } catch (e) {
      console.log(e);
    }

  }

  let logout = async () => {
    await account.deleteSession({ sessionId: 'current' });
    setUser(undefined);
  }

  let getAccount = async () => {
    let user = await account.get();
    setUser(user);
  }

  let subscribe = async () => {
    try {
      console.log('Subscribing to rows and files');

      unsubscribeFromEvents.current = client.subscribe([Channel.rows(), Channel.files()], (event) => {
        console.log('Received event:', event);
        setEvent(event);
      });
      setSubscribed(true);
      console.log('Subscribed to rows and files');
    } catch (e) {
      console.log('Error subscribing:', e);
    }
  }

  let unsubscribe = () => {
    unsubscribeFromEvents.current?.();
    unsubscribeFromEvents.current = null;
    setSubscribed(false);
  }

  let pickFile = async () => {
    let fl = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false
    });
    if (!fl.assets) return;
    try {
      const pickedFile = fl.assets[0];
      const file = { name: pickedFile.name, type: pickedFile.mimeType || 'application/octet-stream', uri: pickedFile.uri, size: pickedFile.size || 0 };
      console.log(pickedFile);
      let uploaded = await storage.createFile({
        bucketId: process.env.EXPO_PUBLIC_APPWRITE_BUCKET!,
        fileId: ID.unique(),
        file,
        permissions: [
          Permission.read(Role.users()),
        ],
        onProgress: (progress) => {
          console.log(progress.chunksUploaded);
        }
      });
      console.log('File uploaded:', uploaded);
      setFile(uploaded);
    } catch (e) {
      console.log(e);
    }
  }

  // For session persistence, load the current account when the screen mounts
  useEffect(() => {
    account.get()
      .then((user) => setUser(user))
      .catch(() => setUser(undefined));
  }, []);

  return (
    <ParallaxScrollView>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Appwrite playground</ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <Button onPress={createAnonymousSession} title="Anonymous login" disabled={!!user} />
        <Button onPress={createSession} title="Login with email" disabled={!!user} />
        <Button onPress={() => createOAuth2Session(OAuthProvider.Google)} title="Login with Google" disabled={!!user} />
        {user && <ThemedText>{user.name.length ? user.name : 'Anonymous user'}</ThemedText>}
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <Button onPress={logout} title="Logout" disabled={!user} />
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <Button onPress={subscribe} title="Subscribe" disabled={!!subscribed} />
        <Button onPress={unsubscribe} title="Unsubscribe" disabled={!subscribed} />
        {event && <ThemedText>{JSON.stringify(event.payload, null, 2)}</ThemedText>}
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <Button onPress={createRow} title="Create row" />
        {row && <ThemedText>{JSON.stringify(row, null, 2)}</ThemedText>}
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <Button onPress={pickFile} title="Upload" />
        {file && file.$id && <Image style={{ height: 500, objectFit: 'contain' }} source={{ uri: storage.getFileViewURL(file.bucketId!, file.$id).href }} />}
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
});
