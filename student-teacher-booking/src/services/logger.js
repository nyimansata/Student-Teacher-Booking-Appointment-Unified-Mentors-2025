import { getFirestoreDB } from "./firebase.js";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

export async function logAction(userId, action, details = {}) {
  const db = getFirestoreDB();
  await addDoc(collection(db, "logs"), {
    userId,
    action,
    details,
    ts: serverTimestamp(),
  });
}
