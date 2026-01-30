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
  console.log("Attempting to list pending teachers...");
  const q = query(
    collection(db, "users"),
    where("role", "==", "pending_teacher")
  );
  const snap = await getDocs(q);
  const out = [];
  snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
  console.log("Found pending teachers:", out);
  return out;
}

// Add teachers
export async function approveTeacherRegistration(
  userId,
  { department = "", subject = "" } = {}
) {
  console.log("approveTeacherRegistration called for userId:", userId, { department, subject });
  const db = getFirestoreDB();

  // set user's role to teacher
  console.log("Attempting to set user role to 'teacher' for userId:", userId);
  await setDoc(doc(db, "users", userId), { role: "teacher" }, { merge: true });
  console.log("User role set to 'teacher' for userId:", userId);

  // fetch user info to populate teacher profile
  const userDoc = await getDoc(doc(db, "users", userId));
  const userData = userDoc.exists() ? userDoc.data() : {};
  const name = userData.name || "";
  const email = userData.email || "";

  // create teacher document with the user's UID as the doc id
  console.log("Attempting to create/update teacher document for userId:", userId);
  await setDoc(doc(db, "teachers", userId), {
    name,
    email,
    department,
    subject,
    userId: userId, // explicitly set userId
    createdAt: serverTimestamp(),
  });
  console.log("Teacher document created/updated for userId:", userId);

  await logAction(userId, "approve_teacher");
  console.log("Teacher approval process completed for userId:", userId);
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
