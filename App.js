import { StatusBar, setStatusBarBackgroundColor } from 'expo-status-bar';
import React, {useState, useEffect} from 'react';
import {Platform, Image, StyleSheet, Text, View, Button, TextInput, Alert, FlatList, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons'; // Import FontAwesome icon from react-native-vector-icons
import {createNativeStackNavigator} from '@react-navigation/native-stack'
import {NavigationContainer} from '@react-navigation/native';
import {app, database, storage} from './firebase.js'
import {collection, addDoc, deleteDoc, doc, updateDoc, getDocs } from 'firebase/firestore'
import {useCollection} from 'react-firebase-hooks/firestore' //install with npm install
import uuid from 'react-native-uuid';
import {ref, uploadBytes, getDownloadURL, deleteObject} from 'firebase/storage'
import * as ImagePicker from 'expo-image-picker'
import {getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, 
  signOut, ReactNativeAsyncStorage, initializeAuth, getReactNativePersistence} from 'firebase/auth'
//npm install expo-image-picker

// Brug UUID til unikke navne på billeder
//uuid.v4(); // ⇨ '11edc52b-2918-4d71-9058-f7285e29d894'
// Brug image array in firebase storage til at gemme flere billeder til en note
// Når image gemmes, skal navnet gemmes i firestore database.

//TODO
//Implementer array af billeder alle steder. I deleteNote, hentbillede,
// uploadbillede, downloadbillede, deleteImage og saveNote og map viewet i detailspage.

let auth
  if(Platform.OS === 'web'){
    auth = getAuth(app)
  } else {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage)
    })
  }

export default function App() {
  const Stack = createNativeStackNavigator()
  
  useEffect (() => {
    const auth_ = getAuth()
    const unsubscribe = onAuthStateChanged(auth_, (currentUser) => {
      if(currentUser){
        console.log("Lytter siger: logget ind som "+currentUser.uid)
        setUserID(currentUser.uid)
      } else {
        console.log("Lytter siger: Ikke logget ind")
      }
    })
    return () => unsubscribe() //Når komponent unmountes, sluk for listener
  }, []) //Tomt array = kun én gang

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName='Login'>
        <Stack.Screen name="Home" component={Home}/>
        <Stack.Screen name="Details" component={Details}/>
        <Stack.Screen name="Login" component={LoginPage}/>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
const Home = ({navigation, route}) => { //En komponent
  
  const [text, setText] = useState('');
  const [userID, setUserID] = useState(route.params?.user); //Note id in firebase
  
  const [values, loading, error] = useCollection(userID ? collection(database, userID) : null);
  const data = values?.docs.map((doc) => ({...doc.data(), id: doc.id}));

  useEffect (() => {
    const auth_ = getAuth()
    const unsubscribe = onAuthStateChanged(auth_, (currentUser) => {
      if(currentUser){
        console.log("Lytter siger: logget ind som "+currentUser.uid)
        navigation.navigate("Home", {user: currentUser.uid})
      } else {
        navigation.navigate("Login")
        console.log("Lytter siger: Ikke logget ind")
      }
    })
    return () => unsubscribe() //Når komponent unmountes, sluk for listener
  }, []) //Tomt array = kun én gang

  async function addNote(){
    const newNote = text.trim();
    if (newNote) {
      try {
        const response = await addDoc(collection(database, userID), {
          text: newNote,
        })
      } catch (error) {
        console.log("error FB:"+error)
      }
      
      setText(''); // Clear the input field after adding the note
    }
  }

  
  async function deleteNote(item){
    try {
      const response = await deleteDoc(doc(database, userID, item.id));
    } catch (error) {
      console.log("error FB:"+error)
    }
  };

  function goToDetailPage(item){
    navigation.navigate("Details", {note: item.text, id: item.id, user: userID})
  }

  async function sign_Out(){ //HVIS NAVNET ER signOut SOM METODEN DER KALDES PÅ LINJE 113 KØRER DEN INFINITE LOOP.
    //DEN VÆLGER SIT EGET FUNKTIONSNAVN, FREMFOR METODEN DER ER IMPORTERET I TOPPEN. 1 TIME SPILDT PÅ DETTE.
    try {
      await signOut(auth)
    } catch (error) {
      console.error("Problem logging out "+ error)
    }
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notes</Text>
      <TextInput style={styles.input} onChangeText={setText} value={text} placeholder='New Note...'/>
      
      <Text>{'\n'}</Text>
      <Button title="Add note" onPress={addNote}/>
      <Button title="Log out" onPress={sign_Out}/>

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
  const id = route.params?.id; //Note id in firebase
  const userID = route.params?.user;
  const [imagePath, setImagePath] = useState(null)

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

  async function downloadBillede(){
    try {
      await getDownloadURL(ref(storage, id))
    .then((url)=>{
      setImagePath(url)
    })
    } catch (error) {
      console.log("Image not found for this note")
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
    const response = await updateDoc(doc(database, userID, id), {
      text: editedNote
    })
    uploadBillede();
    navigation.navigate("Home", {user: userID})
    //Sender index med retur sammen med den gemte note. Så det kan ændres i listen
  }
  function cancelEdit(){
    navigation.navigate("Home", {user: userID})
  }

  downloadBillede()

  //Map view så ImagePath array gås igennem og alle billeder fra array vises. 
  return (
    <View style={styles.container}>

      <View style={styles.imageContainer}>
        <View>
          <Image source={{uri: imagePath}}
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


const LoginPage = ({navigation, route}) => {
  
  const [emailInput, setEmailInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [userID, setUserID] = useState(null)
  const [errorVisible, setErrorVisibility] = useState(false)

  useEffect (() => {
    const auth_ = getAuth()
    const unsubscribe = onAuthStateChanged(auth_, (currentUser) => {
      if(currentUser){
        console.log("Lytter siger: logget ind som "+currentUser.uid)
        navigation.navigate("Home", {user: currentUser.uid})
      } else {
        console.log("Lytter siger: Ikke logget ind")
      }
    })
    return () => unsubscribe() //Når komponent unmountes, sluk for listener
  }, []) //Tomt array = kun én gang


  async function login(){
    try {
      const userCredential = await signInWithEmailAndPassword(auth, emailInput, passwordInput)
      setUserID(userCredential.user.uid)
      console.log("logget ind som "+ userID)
      setEmailInput('')
      setPasswordInput('')
      setErrorVisibility(false)
    } catch (error) {
      console.log("fejl i login: "+ error)
      setErrorVisibility(true)
    }
    setTimeout(() => navigation.navigate("Home", { user: userID }), 3000);
  }
  
  async function signUp(){
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, emailInput, passwordInput)
      console.log("signet up som "+ userCredential.user.uid)
      await addDocToNewUser()
    } catch (error) {
      console.log("fejl i login: "+ error)
    }
  }

  async function addDocToNewUser(){
    try {
      await addDoc(collection(database, userID), {
        text: "Your first note",
      })
    } catch (error) {
      console.error(error)
    }
    
  }
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <TextInput onChangeText={setEmailInput} style={styles.loginInput} value={emailInput} placeholder='E-mail' ></TextInput>
      <TextInput onChangeText={setPasswordInput} style={styles.loginInput} value={passwordInput} placeholder='Password'
      secureTextEntry={true} // This line makes the input show dots for the password
      ></TextInput>
      
      {errorVisible && 
        <Text style={styles.errorText}>Incorrect username/password</Text>
      }
          
      <View style={styles.loginButtonContainer}>
        <Button title="Log in" onPress={login}></Button>
        <View style={styles.buttonSpacer} /> 
        <Button title="Sign up" onPress={signUp}></Button>
      </View> 
      
    </View>
  )
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    backgroundColor: '#D3EAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonContainer: {
    flexDirection: 'row', // Arrange buttons horizontally
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10
  },
  errorText: {
    color: "red",
  },
  buttonSpacer: {
    width: 30, // Adjust the width as needed to create space between buttons
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
  loginInput: {
    fontSize: 20,
    backgroundColor: "white",
    borderColor: 'gray',
    borderWidth: 1,
    paddingHorizontal: 10,
    borderRadius: 10,
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

