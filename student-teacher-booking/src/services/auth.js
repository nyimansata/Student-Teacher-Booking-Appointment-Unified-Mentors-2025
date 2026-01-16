import { getFirebaseAuth, getFirestoreDB, firebaseStatus } from "./firebase.js";
// import {
//   createUserWithEmailAndPassword,
//   signInWithEmailAndPassword,
//   signOut,
//   onAuthStateChanged as onAuthStateChangedFirebase,
// } from "https://www.gstatExpected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestoreic.com/firebasejs/12.7.0/firebase-auth.js";
// import {
//   doc,
//   setDoc,
//   getDoc,
//   serverTimestamp,
// } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup,
  onAuthStateChanged as onAuthStateChangedFirebase,
  GoogleAuthProvider,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { logAction } from "./logger.js";

function ensureInitialized() {
  const auth = getFirebaseAuth();
  const db = getFirestoreDB();
  if (!auth || !db)
    throw new Error(
      "Firebase not initialized. Call initFirebase() and ensure firebase config in src/services/firebase.js is set."
    );
}

// export async function registerUser({
//   name,
//   email,
//   password,
//   role = "student",
// }) {
//   ensureInitialized();
//   const auth = getFirebaseAuth();
//   const db = getFirestoreDB();
//   try {
//     const userCred = await createUserWithEmailAndPassword(
//       auth,
//       email,
//       password
//     );
//     const uid = userCred.user.uid;
//     // store user profile and role. Teacher registrations are stored with status 'pending'
//     await setDoc(doc(db, "users", uid), {
//       name,
//       email,
//       role: role === "teacher" ? "pending_teacher" : "student",
//       createdAt: serverTimestamp(),
//     });
//     await logAction(uid, "register", { role });
//     return uid;
//   } catch (err) {
//     console.error("registerUser error: failed added by nyima", err);
//     // surface friendly message
//     throw new Error(err?.message || "Registration failed");
//   }
// }
//

// registration function
export async function registerUser({
  name,
  email,
  password,
  role = "student",
}) {
  if (!email || !email.includes("@")) {
    throw new Error("Please enter a valid email address");
  }

  email = email.trim();
  password = password.trim();

  const auth = getFirebaseAuth();
  const db = getFirestoreDB();

  const userCred = await createUserWithEmailAndPassword(auth, email, password);

  const uid = userCred.user.uid;

  await setDoc(doc(db, "users", uid), {
    name,
    email,
    role: role === "teacher" ? "teacher" : "student",
    createdAt: serverTimestamp(),
  });

  // If registering as a teacher, create the teacher profile immediately so the user
  // can access the Teacher page without admin approval.
  if (role === "teacher") {
    await setDoc(doc(db, "teachers", uid), {
      name,
      email,
      department: "",
      subject: "",
      userId: uid,
      createdAt: serverTimestamp(),
    });
  }

  return uid;
}

// user login function
export async function loginUser(email, password) {
  ensureInitialized();
  const auth = getFirebaseAuth();
  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    await logAction(userCred.user.uid, "login");
    // log UID and fetch role for convenience
    console.log("Logged in UID:", userCred.user.uid);
    try {
      const db = getFirestoreDB();
      const userDoc = await getDoc(doc(db, "users", userCred.user.uid));
      const profile = userDoc.exists() ? userDoc.data() : {};
      console.log("User role:", profile.role);
    } catch (err) {
      console.warn("Could not fetch user profile after login:", err);
    }
    return userCred.user;
  } catch (err) {
    console.error("loginUser error:", err);
    throw new Error(err?.message || "Login failed");
  }
}

// sign in with google
export async function signInWithGoogle() {
  ensureInitialized();

  const auth = getFirebaseAuth();
  const db = getFirestoreDB();
  const provider = new GoogleAuthProvider();

  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  // Create user profile if it doesn't exist
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      name: user.displayName || "",
      email: user.email || "",
      role: "student",
      createdAt: serverTimestamp(),
    });
  }

  await logAction(user.uid, "login_google");
  return user;
}

// export async function logoutUser() {
//   ensureInitialized();
//   const auth = getFirebaseAuth();
//   const uid = auth?.currentUser?.uid;
//   try {
//     // log logout before signing out so the write is authorized by the current session
//     if (uid) await logAction(uid, "logout");
//     await signOut(auth);
//   } catch (err) {
//     console.error("logoutUser error:", err);
//     throw err;
//   }
// }

export async function logoutUser() {
  const auth = getFirebaseAuth();
  await signOut(auth);
}

export function onAuthStateChanged(cb) {
  const auth = getFirebaseAuth();
  if (!auth) {
    console.warn("onAuthStateChanged: Firebase Auth not initialized");
    cb(null);
    return;
  }
  onAuthStateChangedFirebase(auth, async (user) => {
    try {
      if (user) {
        const db = getFirestoreDB();
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const profile = userDoc.exists() ? userDoc.data() : { role: "student" };
        cb({ ...user, profile });
      } else cb(null);
    } catch (err) {
      console.error("onAuthStateChanged handler error:", err);
      cb(null);
    }
  });
}

export function authStatus() {
  try {
    return { initialized: true, ...firebaseStatus() };
  } catch (e) {
    return { initialized: false };
  }
}

/**
 * Run lightweight auth diagnostics. Attempts to create a user with a deliberately weak password
 * to detect whether Email/Password sign-in is enabled and whether Auth is reachable.
 * This avoids creating valid accounts because we expect a 'weak-password' error when provider is enabled.
 */
export async function authDiagnostics() {
  ensureInitialized();
  const auth = getFirebaseAuth();
  const diagEmail = `diag-${Date.now()}@example.com`;
  try {
    await createUserWithEmailAndPassword(auth, diagEmail, "123");
    return {
      ok: true,
      message:
        "Unexpectedly created user with weak password (provider accepted the password).",
    };
  } catch (err) {
    console.warn("authDiagnostics caught error", err);
    if (err.code === "auth/operation-not-allowed") {
      return {
        ok: false,
        code: err.code,
        message:
          "Email/Password provider is disabled in Firebase Console (Auth → Sign-in method).",
      };
    }
    if (err.code === "auth/weak-password") {
      return {
        ok: true,
        code: err.code,
        message:
          "Auth reachable and Email/Password provider is enabled (weak-password returned).",
      };
    }
    return {
      ok: false,
      code: err.code || "unknown",
      message: err.message || String(err),
    };
  }
}
