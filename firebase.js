// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {getFirestore} from "firebase/firestore"
import {getStorage} from 'firebase/storage'


// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAAfNZK_2Ce_l4AiQ28wDPJUEtl52huWuc",
  authDomain: "reactproject1-4d834.firebaseapp.com",
  projectId: "reactproject1-4d834",
  storageBucket: "reactproject1-4d834.appspot.com",
  messagingSenderId: "648940520542",
  appId: "1:648940520542:web:4c174ebdf6422de4bca0cf"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getFirestore(app)
const storage = getStorage(app)
export {app, database, storage}