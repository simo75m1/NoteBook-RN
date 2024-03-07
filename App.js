import { StatusBar, setStatusBarBackgroundColor } from 'expo-status-bar';
import React, {useState, useEffect} from 'react';
import { Image, StyleSheet, Text, View, Button, TextInput, Alert, FlatList, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons'; // Import FontAwesome icon from react-native-vector-icons
import {createNativeStackNavigator} from '@react-navigation/native-stack'
import {NavigationContainer} from '@react-navigation/native';
import {app, database, storage} from './firebase.js'
import {collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import {useCollection} from 'react-firebase-hooks/firestore' //install with npm install
import uuid from 'react-native-uuid';

import {ref, uploadBytes, getDownloadURL, deleteObject} from 'firebase/storage'
import * as ImagePicker from 'expo-image-picker'
//npm install expo-image-picker

// Brug UUID til unikke navne på billeder
//uuid.v4(); // ⇨ '11edc52b-2918-4d71-9058-f7285e29d894'
// Brug image array in firebase storage til at gemme flere billeder til en note
// Når image gemmes, skal navnet gemmes i firestore database.

//TODO
//Implementer array af billeder alle steder. I deleteNote, hentbillede,
// uploadbillede, downloadbillede, deleteImage og saveNote og map viewet i detailspage.


export default function App() {
  const Stack = createNativeStackNavigator()
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName='Home'>
        <Stack.Screen name="Home" component={Home}/>
        <Stack.Screen name="Details" component={Details}/>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
const Home = ({navigation, route}) => { //En komponent
  
  const [text, setText] = useState('');
  const [values, loading, error] = useCollection(collection(database, "notes"))
  const data = values?.docs.map((doc) => ({...doc.data(), id:doc.id}))

  async function addNote(){
    const newNote = text.trim();
    if (newNote) {
      try {
        const response = await addDoc(collection(database, "notes"), {
          text: newNote,
          images: []
        })
      } catch (error) {
        console.log("error FB:"+error)
      }
      
      setText(''); // Clear the input field after adding the note
    }
  }

  async function deleteNote(item){
    try {
      const response = await deleteDoc(doc(database, "notes", item.id));
    } catch (error) {
      console.log("error FB:"+error)
    }
  };

  function goToDetailPage(item){
    navigation.navigate("Details", {note: item.text, images: item.images, id: item.id})
  }

  return (
    <View style={styles.container}>
      <TextInput style={styles.input} onChangeText={setText} value={text} placeholder='New Note...'/>
      
      <Text>{'\n'}</Text>
      <Button title="Add note" onPress={addNote}/>

      <Text style={styles.title}>Notes:</Text>
      <FlatList
        data={data}
        renderItem={({ item}) => (
          <View style={styles.noteContainer}>
            <TouchableOpacity style={styles.touchOpacity} onPress={() => goToDetailPage(item)}>
              <Text style={styles.noteItem}>{item.text}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteNote(item)}>
              <MaterialIcons name="delete" size={24} color="red" />
            </TouchableOpacity>
          </View>
        )}
      />
      <StatusBar style="auto" />
    </View>
  )
}


const Details = ({navigation, route}) => { //En komponent
  const [editText, setText] = useState(route.params?.note);
  const [noteImages, setNoteImages] = useState(route.params?.images)
  const id = route.params?.id; //Note id in firebase
  const [imagePath, setImagePath] = useState([])

  async function hentBillede(){
    const resultat = await ImagePicker.launchImageLibraryAsync({
      allowsEditing:true
    })
    if(!resultat.canceled){
      console.log("Fået et billede..." + resultat)
      setImagePath(resultat.assets[0].uri) //sætter stien til billedet
    }
  }

  async function uploadBillede(){
    const res = await fetch(imagePath)
    const blob = await res.blob()
    const storageRef = ref(storage, id)
    uploadBytes(storageRef, blob).then(() => {
      console.log("Image uploaded!")
    })
  }

  async function downloadBillede() {
    if (noteImages) {
      const downloadURLs = await Promise.all(noteImages.map(async (image) => {
        try {
          const url = await getDownloadURL(ref(storage, image));
          return url;
        } catch (error) {
          console.log("Image not found for this note");
          return null;
        }
      }));
      // Filter out any null values (in case of errors)
      const filteredURLs = downloadURLs.filter(url => url !== null);
      // Update the imagePath array with the downloaded URLs
      setImagePath(filteredURLs);
    }
  }
  const deleteImage = () => {
    const imageRef = ref(storage, imagePath)
    deleteObject(imageRef)
    .then(()=> {
      console.log("Delete succesful")
      setImagePath(null)
    })
  };

  async function launchCamera(){
    const result = await ImagePicker.requestCameraPermissionsAsync()
    if(!result.granted){
      console.log("Kamera ikke tilladt")
    } else {
      ImagePicker.launchCameraAsync({
        quality: 1 //fra 0.0 til 1.0
      })
      .then((response) => {
        console.log("Billede ankommet " + response)
        setImagePath(response.assets[0].uri)
      })
    }
  }



  async function saveNote(){
    const editedNote = editText.trim();
    const response = await updateDoc(doc(database, "notes", id), {
      text: editedNote
    })
    uploadBillede();
    navigation.navigate("Home")
    //Sender index med retur sammen med den gemte note. Så det kan ændres i listen
  }
  function cancelEdit(){
    navigation.navigate("Home")
  }

  downloadBillede()

  //Map view så ImagePath array gås igennem og alle billeder fra array vises. 
  return (
    <View style={styles.container}>

<View style={styles.imageContainer}>
        <View>
          <Image source={{ uri: imagePath[0] }}
            style={styles.noteImage}/>
            <TouchableOpacity style={styles.deleteImageButton} onPress={() => deleteImage()}>
              <MaterialIcons name="delete" size={24} color="red" />
            </TouchableOpacity>
        </View>
      </View>
          {/* <Image source={{uri:imagePath}} style={styles.noteImage}/> */}
          <Button title="Add a new image" onPress={hentBillede}/>
          <Button title="Take picture" onPress={launchCamera}/>
          <Text style={styles.title}>This is the page for details!</Text>
          <Text style={styles.title}>You can edit your note here</Text>
          <Text>{'\n'}</Text>
          <TextInput
            onChangeText={setText}
            style={styles.input}
            value={editText}
            placeholder='Enter Text'
          />
          <Button title="Save note" onPress={saveNote}/>
          <Text>{'\n'}</Text>
          <Button title="Cancel" onPress={cancelEdit}/>
        </View>
  )
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 200,
    backgroundColor: '#D3EAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteImage: {
    width: 150,
    height: 150,
  },
  touchOpacity: {
    borderWidth: 1,
    padding: 5,
    borderRadius: 10,
    marginTop: 7,
    backgroundColor: "#E6F3FC"
  },
  input: {
    fontSize: 20,
    height: 40,
    width: 300,
    borderColor: 'gray',
    borderWidth: 1,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#E6F3FC"
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noteItem: {
    fontSize: 15,
    width: 200
  },
  title: {
    marginVertical: 5,
    fontWeight: "bold",
    fontSize: 20
  },
  noteText: {
    flex: 1, // Take up all available space
  },
  
  deleteImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    padding: 5,
    borderRadius: 5,
    zIndex: 1,
  },
  
  icon: {
    marginLeft: 10
  }
});

