import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

let app, auth, db;

const firebaseConfig = {
  apiKey: "AIzaSyACurbYLCnYanP8iKmpw7XkIqf-ggcPEvE",
  authDomain: "student-teacher-booking-df716.firebaseapp.com",
  databaseURL:
    "https://student-teacher-booking-df716-default-rtdb.firebaseio.com",
  projectId: "student-teacher-booking-df716",
  storageBucket: "student-teacher-booking-df716.firebasestorage.app",
  messagingSenderId: "920709530860",
  appId: "1:920709530860:web:4252177d75d4443ee751c9",
  measurementId: "G-ZPKM76EP5J",
};

export function initFirebase() {
  if (!app) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  }
}

export function getFirebaseAuth() {
  if (!auth) throw new Error("Firebase Auth not initialized");
  return auth;
}

export function getFirestoreDB() {
  if (!db) throw new Error("Firestore not initialized");
  return db;
}

export function firebaseStatus() {
  return { app: !!app, auth: !!auth, db: !!db };
}

export const googleProvider = new GoogleAuthProvider();
