// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD8mYF3nrI_kEVNww3mKx6FQMGyW8gWabk",
  authDomain: "smartbuy-7165e.firebaseapp.com",
  projectId: "smartbuy-7165e",
  storageBucket: "smartbuy-7165e.firebasestorage.app",
  messagingSenderId: "287789143744",
  appId: "1:287789143744:web:986b14bb33ad8f299c3f25",
  measurementId: "G-HX8JSCPXXW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
