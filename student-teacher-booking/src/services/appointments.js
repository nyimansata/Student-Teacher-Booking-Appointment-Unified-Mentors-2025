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

// export async function bookAppointment({ teacherId, purpose, when }) {
//   const db = getFirestoreDB();
//   const auth = getFirebaseAuth();
//   const user = auth && auth.currentUser;
//   if (!user) {
//     // Fail fast with a helpful message so callers can handle it gracefully
//     throw new Error("Not signed in: please sign in to request an appointment");
//   }
//   const uid = user.uid;

//   // include student profile snapshot (name/email) in appointment so teachers can display it
//   let studentName = "";
//   let studentEmail = "";
//   try {
//     const userDoc = await getDoc(doc(db, "users", uid));
//     if (userDoc.exists()) {
//       const ud = userDoc.data();
//       studentName = ud.name || "";
//       studentEmail = ud.email || "";
//     }
//   } catch (err) {
//     console.warn("Could not fetch student profile for appointment:", err);
//   }

//   // look up teacher doc to see if it maps to an auth user id
//   let teacherUserId = null;
//   try {
//     const tDoc = await getDoc(doc(db, "teachers", teacherId));
//     if (tDoc.exists()) {
//       teacherUserId = tDoc.data().userId || null;
//     }
//   } catch (err) {
//     // not a teacher doc id or lookup failed - ignore
//   }

//   // if (!teacherUserId) {
//   //   throw new Error("Teacher is not linked to an account. Contact admin.");
//   // }

//   // store teacherId as the teacher's auth UID when available so teacher can read the appointment
//   // const storedTeacherId = teacherUserId || teacherId;

//   // if (!teacherUserId) {
//   //   throw new Error("Teacher is not linked to an account. Contact admin.");
//   // }

//   const data = {
//     studentId: uid,
//     studentName,
//     studentEmail,
//     // teacherId is the identifier used in security rules and queries.
//     // we set it to the teacher's auth UID if available, otherwise it's the teacher doc id.
//     // teacherId: storedTeacherId,
//     // teacherDocId: teacherId,
//     // teacherUid: teacherUserId || null,

//     teacherId: teacherUserId, // 🔐 AUTH UID (used by rules)
//     teacherDocId: teacherId, // 📎 reference only
//     teacherUid: teacherUserId, // optional duplicate, OK

//     // teacherUid: teacherUserId, // ✅ ONLY UID used for ownership
//     // teacherDocId: teacherId, // optional, for reference
//     purpose,
//     when,
//     status: "pending",
//     // use serverTimestamp to avoid client clock skew and to be compatible with rules
//     createdAt: serverTimestamp(),
//   };

//   try {
//     console.log("Attempting to create appointment", { uid, data });
//     // helpful debug: ensure studentId matches current uid
//     console.log("studentId match?", {
//       studentId: data.studentId,
//       uid,
//       match: data.studentId === uid,
//     });
//     console.log("appointment data (json):", JSON.stringify(data));
//     if (data.studentId !== uid) {
//       throw new Error(
//         `studentId mismatch: data.studentId=${data.studentId} but auth uid=${uid}`
//       );
//     }
//     const ref = await addDoc(collection(db, "appointments"), data);
//     await logAction(uid, "book_appointment", { appointmentId: ref.id });
//     return ref.id;
//   } catch (err) {
//     console.error("bookAppointment failed", err, { uid, data });
//     // Surface a clearer error message when it's a permissions problem
//     if (err && err.code === "permission-denied") {
//       throw new Error(
//         "Permission denied: you may not be allowed to create appointments. Ensure you are signed in and your account is a student."
//       );
//     }
//     throw err;
//   }
// }

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

    teacherUid, // ✅ used for permissions & queries
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

// export async function getAppointmentsForTeacher(
//   teacherDocId,
//   teacherUserId = null
// ) {
//   const db = getFirestoreDB();
//   const outMap = new Map();

//   // query by teacherDocId (older bookings)
//   try {
//     const q1 = query(
//       collection(db, "appointments"),
//       where("teacherId", "==", teacherDocId)
//     );
//     const snap1 = await getDocs(q1);
//     snap1.forEach((d) => outMap.set(d.id, { id: d.id, ...d.data() }));
//   } catch (err) {
//     // ignore
//   }

//   // query by teacherUserId (bookings stored with teacher UID)
//   if (teacherUserId) {
//     const q2 = query(
//       collection(db, "appointments"),
//       where("teacherId", "==", teacherUserId)
//     );
//     const snap2 = await getDocs(q2);
//     snap2.forEach((d) => outMap.set(d.id, { id: d.id, ...d.data() }));
//   }

//   // return merged list sorted by createdAt desc
//   const out = Array.from(outMap.values()).sort((a, b) => {
//     const ta =
//       a.createdAt && a.createdAt.seconds
//         ? a.createdAt.seconds
//         : a.createdAt || 0;
//     const tb =
//       b.createdAt && b.createdAt.seconds
//         ? b.createdAt.seconds
//         : b.createdAt || 0;
//     return tb - ta;
//   });
//   return out;
// }

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
