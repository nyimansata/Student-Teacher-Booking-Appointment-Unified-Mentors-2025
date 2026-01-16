import { getFirestoreDB } from "./firebase.js";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  addDoc,
  orderBy,
  limit,
  getDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { logAction } from "./logger.js";

export async function listPendingTeachers() {
  const db = getFirestoreDB();
  const q = query(
    collection(db, "users"),
    where("role", "==", "pending_teacher")
  );
  const snap = await getDocs(q);
  const out = [];
  snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
  return out;
}

// Add teachers
export async function approveTeacherRegistration(
  userId,
  { department = "", subject = "" } = {}
) {
  const db = getFirestoreDB();
  // set user's role to teacher
  await setDoc(doc(db, "users", userId), { role: "teacher" }, { merge: true });
  // fetch user info to populate teacher profile
  const userDoc = await getDoc(doc(db, "users", userId));
  const userData = userDoc.exists() ? userDoc.data() : {};
  const name = userData.name || "";
  const email = userData.email || "";
  // create teacher document with the user's UID as the doc id so student bookings
  // (which use teacherId = t.id) reference the teacher's auth UID and teacher
  // can query appointments by auth UID
  await setDoc(doc(db, "teachers", userId), {
    name,
    email,
    department,
    subject,
    // userId,
    userId: userId,
    createdAt: serverTimestamp(),
  });
  await logAction(userId, "approve_teacher");
}

export async function rejectTeacherRegistration(userId) {
  const db = getFirestoreDB();
  await setDoc(
    doc(db, "users", userId),
    { role: "rejected_teacher" },
    { merge: true }
  );
  await logAction(userId, "reject_teacher");
}

export async function listLogs(limitCount = 100) {
  const db = getFirestoreDB();
  const q = query(
    collection(db, "logs"),
    orderBy("ts", "desc"),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  const out = [];
  snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
  return out;
}

export function showSuccessModal(message) {
  const modal = document.getElementById("success-modal");
  const text = document.getElementById("success-message");

  text.textContent = message;
  modal.classList.add("show");

  setTimeout(() => {
    modal.classList.remove("show");
  }, 2500);
}
