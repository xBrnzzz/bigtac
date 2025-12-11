
// Import the functions you need from the SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    addDoc, 
    deleteDoc, 
    updateDoc, 
    getDoc, 
    doc, 
    query, 
    orderBy, 
    onSnapshot, 
    serverTimestamp, 
    where, 
    runTransaction, 
    writeBatch, 
    setDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// --- NEW: Import Messaging ---
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBhxj-pfjX2BSJYXelUI-h0nU_QZ8zWdWE",
  authDomain: "bigtac-294c9.firebaseapp.com",
  projectId: "bigtac-294c9",
  storageBucket: "bigtac-294c9.firebasestorage.app",
  messagingSenderId: "774247023180",
  appId: "1:774247023180:web:a598b8ce9c3234e45b2ae9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const messaging = getMessaging(app); // --- NEW: Initialize Messaging

// EXPORT the tools so admin.html and index.html can use them
export { 
    app, 
    db, 
    auth,
    messaging, // --- NEW: Export Messaging service
    // Firestore functions
    collection, getDocs, addDoc, deleteDoc, updateDoc, getDoc, doc, query, orderBy, onSnapshot, serverTimestamp, where, runTransaction, writeBatch, setDoc,
    // Auth functions
    signInWithEmailAndPassword, onAuthStateChanged, signOut,
    // Messaging functions
    getToken, onMessage // --- NEW: Export helper functions
};
