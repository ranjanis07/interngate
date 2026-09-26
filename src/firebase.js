
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAUPlN__vo60LiDFtN67AScsQv5ed6Rrbs",
  authDomain: "campus-interngate.firebaseapp.com",
  projectId: "campus-interngate",
  storageBucket: "campus-interngate.firebasestorage.app",
  messagingSenderId: "505147017105",
  appId: "1:505147017105:web:95876d4d4ab6f770dcfc30"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
