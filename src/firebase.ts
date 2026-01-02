
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCiosArE3iOxF9iGp8wduA-TlSgy1p3WUo",
  authDomain: "vibenotes-87a8f.firebaseapp.com",
  projectId: "vibenotes-87a8f",
  storageBucket: "vibenotes-87a8f.firebasestorage.app",
  messagingSenderId: "306552916980",
  appId: "1:306552916980:web:0f8e798e50747ad1c587a1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const auth = getAuth(app);