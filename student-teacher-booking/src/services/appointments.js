import { getFirestoreDB } from "./firebase.js";
import {
  collection,
  addDoc,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  getDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { getFirebaseAuth } from "./firebase.js";
import { logAction } from "./logger.js";

export async function bookAppointment({ teacherId, purpose, when }) {
  const db = getFirestoreDB();
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;

  if (!user) {
    throw new Error("Not signed in");
  }

  const uid = user.uid;

  // ---- student snapshot ----
  let studentName = "";
  let studentEmail = "";

  const userDoc = await getDoc(doc(db, "users", uid));
  if (userDoc.exists()) {
    studentName = userDoc.data().name || "";
    studentEmail = userDoc.data().email || "";
  }

  // ---- RESOLVE TEACHER AUTH UID (FIX) ----
  let teacherUid = null;

  const teacherDoc = await getDoc(doc(db, "teachers", teacherId));
  if (teacherDoc.exists()) {
    teacherUid = teacherDoc.data().userId || teacherDoc.id;
  }

  if (!teacherUid) {
    throw new Error(
      "Teacher account is not linked correctly. Please contact admin."
    );
  }

  // ---- SAVE APPOINTMENT (CLEAN) ----
  const data = {
    studentId: uid,
    studentName,
    studentEmail,

    teacherUid, // used for permissions & queries
    teacherDocId: teacherId, // optional reference only

    purpose,
    when,
    status: "pending",
    createdAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, "appointments"), data);
  await logAction(uid, "book_appointment", { appointmentId: ref.id });

  return ref.id;
}

export async function getAppointmentsForTeacher(teacherUid) {
  const db = getFirestoreDB();

  const q = query(
    collection(db, "appointments"),
    where("teacherUid", "==", teacherUid)
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
}

/**
 * List all appointments (admin)
 */
export async function listAllAppointments() {
  const db = getFirestoreDB();
  const snap = await getDocs(collection(db, "appointments"));
  const out = [];
  snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
  return out;
}

export async function approveAppointment(appointmentId) {
  const db = getFirestoreDB();
  await setDoc(
    doc(db, "appointments", appointmentId),
    { status: "approved" },
    { merge: true }
  );
}

export async function cancelAppointment(appointmentId) {
  const db = getFirestoreDB();
  await setDoc(
    doc(db, "appointments", appointmentId),
    { status: "cancelled" },
    { merge: true }
  );
}

export async function rejectAppointment(appointmentId) {
  const db = getFirestoreDB();
  await setDoc(
    doc(db, "appointments", appointmentId),
    { status: "rejected" },
    { merge: true }
  );
}

export async function getAppointmentsForUser(uid) {
  const db = getFirestoreDB();
  const q = query(
    collection(db, "appointments"),
    where("studentId", "==", uid)
  );
  const snap = await getDocs(q);
  const out = [];
  snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
  return out;
}
