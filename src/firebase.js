import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCszwVnMfrKDEQWAnoNE-MBccKfp6ejqXY",
  authDomain: "dealflow-2df35.firebaseapp.com",
  projectId: "dealflow-2df35",
  storageBucket: "dealflow-2df35.firebasestorage.app",
  messagingSenderId: "349300127648",
  appId: "1:349300127648:web:7edd3bd87a4ac57ebed6c5",
  measurementId: "G-B8VR8T2EYK"
};

const app = initializeApp(firebaseConfig);

// Explicitly "(default)" database use karein
export const db = getFirestore(app, "(default)");
export const auth = getAuth(app);