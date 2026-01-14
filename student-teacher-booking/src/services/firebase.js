// // Firebase initialization (modular SDK v9+)
// import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
// import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
// import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// let app, auth, db;

// export function initFirebase(config = null) {
//   try {
//     // Allow injecting config for testing; otherwise use the file-local placeholder
//     const firebaseConfig = config || // TODO: Replace with your Firebase config
//     {
//       apiKey: "YOUR_API_KEY",
//       authDomain: "YOUR_AUTH_DOMAIN",
//       projectId: "YOUR_PROJECT_ID",
//       storageBucket: "YOUR_STORAGE_BUCKET",
//       messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
//       appId: "YOUR_APP_ID",
//     };

//     // Basic check: warn if the placeholder values are still present
//     if (
//       !firebaseConfig.apiKey ||
//       String(firebaseConfig.apiKey).startsWith("YOUR_")
//     ) {
//       console.warn(
//         "Firebase config looks like placeholder values. Replace the object in src/services/firebase.js with your real project config. Authentication and Firestore will not work until then."
//       );
//     }

//     app = initializeApp(firebaseConfig);
//     auth = getAuth(app);
//     db = getFirestore(app);
//     // expose a helper for debugging in the browser console
//     try {
//       window.__STB_firebaseStatus = () => ({
//         app: !!app,
//         auth: !!auth,
//         db: !!db,
//       });
//     } catch (e) {}
//     console.info(
//       "Firebase initialized",
//       firebaseConfig.projectId || "(no projectId)"
//     );
//   } catch (err) {
//     console.error("initFirebase failed:", err);
//     throw err;
//   }
// }

// export function firebaseStatus() {
//   return { app: !!app, auth: !!auth, db: !!db };
// }

// export function getFirebaseAuth() {
//   return auth;
// }
// export function getFirestoreDB() {
//   return db;
// }

// src/services/firebase.js
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
