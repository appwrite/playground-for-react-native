import { StatusBar } from 'expo-status-bar';
/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { Account, Client, Permission, Role, Storage, Models, Databases, ID, RealtimeResponseEvent } from 'react-native-appwrite';
import React, { useState } from 'react';
import {
  Button,
  Image,
  ImageComponent,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

let client;
let account;
let storage;
let databases;


function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [user, setUser] = useState();
  const [event, setEvent] = useState();
  const [file, setFile] = useState();
  let subscription;

  let setupAppwrite = async () => {
    client = new Client();
    client.setEndpoint('https://cloud.appwrite.io/v1').setProject('rntest').setPlatform('io.appwrite.playgroundForReactNative');
    account = new Account(client);
    storage = new Storage(client);
    databases = new Databases(client);

  }


  let createSession = async () => {
    try {

      await account.createEmailSession('user@appwrite.io', 'password');
      getAccount();
    } catch (e) {
      console.log(e);

    }
  }
  let createAnonymousSession = async () => {
    await account.createAnonymousSession();
    getAccount();
  }
  let createDoc = async () => {
    await databases.createDocument('65e7e1452ea7c6473b01', 'usernames', ID.unique(), {
      username: 'test'
    }, [
      Permission.read(Role.any()),
      Permission.write(Role.any())
    ]);
  }

  let logout = async () => {
    await account.deleteSession('current');
    setUser(undefined);
  }

  let getAccount = async () => {
    let user = await account.get();
    setUser(user);
  }

  let subscribe = async () => {
    subscription = client.subscribe(['documents', 'files'], (event) => {
      setEvent(event);
    });

  }


  let pickFile = async () => {
    var fl = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false
    });
    await setupAppwrite();
    let storage = new Storage(client);
    if (!fl.assets) return;
    try {
      var pickedFile = fl.assets[0];
      pickedFile = { name: pickedFile.name, type: pickedFile.mimeType, uri: pickedFile.uri, size: pickedFile.size };
      console.log(pickedFile);
      let uploaded = await storage.createFile('test', 'unique()', pickedFile, [
        Permission.read(Role.users()),
      ], (progress) => {
        console.log(progress.chunksUploaded);
      });
      setFile(uploaded);
    } catch (e) {
      console.log(e);
    }
  }

  if (!client) {
    setupAppwrite();
  }

  const backgroundStyle = {
    backgroundColor: isDarkMode ? '#333333' : '#f2f2f2f2',
    padding: 20,
    paddingTop: 60,
  };

  const buttonStyle = {
    backgroundColor: isDarkMode ? 'black' : 'white',
    marginBottom: 20,
    padding: 20,
    alignItems: 'center',
  }

  const buttonTextStyle = {
    color: isDarkMode ? 'white' : 'black'
  }

  const headingStyle = {
    color: isDarkMode ? 'white' : 'black',
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 20,
  }

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView>

        <View style={backgroundStyle}>

          <Text style={headingStyle}>Appwrite playground</Text>
          <TouchableOpacity onPress={createAnonymousSession} style={buttonStyle}>
            <Text style={buttonTextStyle}>Anonymous login</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={createSession} style={buttonStyle}>
            <Text style={buttonTextStyle}>Login with email</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={subscribe} style={buttonStyle}>
            <Text style={buttonTextStyle}>Subscribe</Text>
          </TouchableOpacity>
          {event && <Text>{JSON.stringify(event.payload)}</Text>}
          {file && file.$id && <Image style={{ height: 500, objectFit: 'contain' }} source={{ uri: storage.getFilePreview('test', file.$id, 400, 500).href }} />}
          <TouchableOpacity onPress={createDoc} style={buttonStyle}>
            <Text style={buttonTextStyle}>Create Doc</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={pickFile} style={buttonStyle}>
            <Text style={buttonTextStyle}>Upload</Text>
          </TouchableOpacity>
          {user && <Text>{user.name.length ? user.name : 'Anonymous user'}</Text>}
          <TouchableOpacity onPress={logout} style={buttonStyle}>
            <Text style={buttonTextStyle}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
});

export default App;