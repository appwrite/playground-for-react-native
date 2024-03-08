/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { Account, Client, Permission, Role, Storage, Models, Databases, ID, RealtimeResponseEvent } from 'react-native-appwrite';
import React, { useState } from 'react';
import type {PropsWithChildren} from 'react';
import {
  Button,
  Image,
  ImageComponent,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { DocumentPickerResponse, pick, pickSingle } from 'react-native-document-picker';

import {
  Colors,
} from 'react-native/Libraries/NewAppScreen';

let client: Client;
let account: Account;
let storage: Storage;
let databases: Databases;


function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [user, setUser] = useState<Models.User<any>>();
  const [event, setEvent] = useState<RealtimeResponseEvent<any>>();
  let subscription: any;

  let setupAppwrite = async () => {
    client = new Client();
    client.setEndpoint('https://cloud.appwrite.io/v1').setProject('rntest').setPlatform('io.appwrite.playgroundForReactNative');
    account = new Account(client);
    storage = new Storage(client);
    databases = new Databases(client);
  
  }

  
  let createSession = async () => {
    await account.createEmailSession('user@appwrite.io', 'password');
    getAccount();
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
    let file: DocumentPickerResponse = await pickSingle();
    console.log(file);
    await setupAppwrite();
    let storage = new Storage(client);
    await storage.createFile('test', 'unique()', file, [
      Permission.read(Role.users()),
    ], (progress) => {
      console.log(progress.chunksUploaded);
    });
  }

  if(!client) {
    setupAppwrite();
  }

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
    padding: 20,
  };

  const buttonStyle = {
    backgroundColor: isDarkMode ? Colors.black : Colors.white,
    marginBottom: 20,
    padding: 20,
    alignItems: 'center',
  }

  const buttonTextStyle = {
    color: isDarkMode ? Colors.white : Colors.black  
  }

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView>

        <View style={backgroundStyle}>
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
            {event && event.payload && event.payload.mimeType?.includes('image') && <Image style={{height: 500, objectFit: 'contain'}} source={{uri: storage.getFilePreview('test',event.payload.$id, 400, 500).href}} />}
            <TouchableOpacity onPress={createDoc} style={buttonStyle}>
                <Text style={buttonTextStyle}>Create Doc</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={pickFile} style={buttonStyle}>
                <Text style={buttonTextStyle}>Upload</Text>
            </TouchableOpacity>
            {user && <Text>{user.name.length ? user.name : 'Anonymous user'}</Text> }
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

