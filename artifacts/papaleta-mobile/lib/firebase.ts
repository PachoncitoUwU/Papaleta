import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInAnonymously,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

const FB_CONFIG = {
  apiKey: "AIzaSyCtG3HMUGdDDht9wliTpl1jKYg7dLk76v0",
  authDomain: "papaleta-f8ff5.firebaseapp.com",
  projectId: "papaleta-f8ff5",
  storageBucket: "papaleta-f8ff5.firebasestorage.app",
  messagingSenderId: "934397525448",
  appId: "1:934397525448:web:aa9afabfb01b6b1dfed4fd",
};

const fbApp =
  getApps().length === 0 ? initializeApp(FB_CONFIG) : getApps()[0];
const auth = getAuth(fbApp);
const db = getFirestore(fbApp);
const googleProvider = new GoogleAuthProvider();

export {
  fbApp,
  auth,
  db,
  googleProvider,
  signInAnonymously,
  firebaseSignOut,
  onAuthStateChanged,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  type User,
};
