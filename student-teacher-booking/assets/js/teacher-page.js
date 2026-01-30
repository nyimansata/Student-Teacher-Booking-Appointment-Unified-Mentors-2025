import {
  initFirebase,
  firebaseStatus,
  getFirestoreDB,
} from "../../src/services/firebase.js";
import { onAuthStateChanged, logoutUser } from "../../src/services/auth.js";
import {
  getAppointmentsForTeacher,
  approveAppointment,
  cancelAppointment,
} from "../../src/services/appointments.js";
import {
  findTeacherDocForUser,
  linkTeacherDocToUser,
} from "../../src/services/teacher.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { showSuccessModal } from "../../src/services/admin.js";

initFirebase();

try {
  const s = firebaseStatus();
  if (!s.auth || !s.db) {
    console.warn(
      "Firebase not fully configured. Teacher features may not work."
    );
  }
} catch (e) {
  console.warn("firebaseStatus check failed", e);
}

async function renderTeacherPanel(
  teacherUid
  // teacherDocId
) {
  const appointmentsContainer = document.getElementById("teacher-appointments");
  appointmentsContainer.innerHTML = "";

  const tmpl = document.getElementById("teacher-appointment");

  let appts = await getAppointmentsForTeacher(teacherUid);
  console.log("Appointments fetched with teacherUid:", teacherUid, appts);

  // Fallback to teacherDocId if no appointments found with teacherUid
  if (appts.length === 0 && teacherDocId) {
    console.log("No appointments found with teacherUid, trying with teacherDocId:", teacherDocId);
    appts = await getAppointmentsForTeacher(teacherDocId);
  }

  console.log("Appointments fetched:", appts.length, appts);

  if (appts.length === 0) {
    appointmentsContainer.textContent = "No appointment requests yet.";
    return;
  }

  appts.forEach((a) => {
    const node = tmpl.content.cloneNode(true);
    const el = node.querySelector(".appointment-card");

    el.querySelector(".student-name").textContent =
      a.studentName || a.studentId;

    el.querySelector(".appointment-when").textContent = a.when || "";
    el.querySelector(".appointment-purpose").textContent = `Purpose: ${
      a.purpose || ""
    }`;

    el.querySelector(".appointment-status").textContent = `Status: ${
      a.status || "pending"
    }`;

    const btnApprove = el.querySelector(".btn-approve-appt");
    const btnCancel = el.querySelector(".btn-cancel-appt");

    btnApprove.onclick = async () => {
      await approveAppointment(a.id);
      await renderTeacherPanel(teacherUid);
    };

    btnCancel.onclick = async () => {
      await cancelAppointment(a.id);
      await renderTeacherPanel(teacherUid);
    };

    appointmentsContainer.appendChild(el);
  });
}

onAuthStateChanged(async (user) => {
  const nav = document.getElementById("teacher-nav");
  const authWarning = document.getElementById("auth-warning");
  const panel = document.getElementById("teacher-panel");

  if (!user) {
    // not signed in
    panel.style.display = "none";
    authWarning.style.display = "block";
    nav.innerHTML = "";
    return;
  }

  try {
    const db = getFirestoreDB();
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) throw new Error("User profile not found");

    const role = userSnap.data().role;
    if (role !== "teacher") {
      // redirect students/admins away
      location.href = "../../index.html";
      return;
    }

    // show logout button
    nav.innerHTML = "";
    const btnLogout = document.createElement("button");
    btnLogout.textContent = "Logout";
    btnLogout.addEventListener("click", async () => {
      await logoutUser();
      location.href = "../../index.html";
    });
    nav.appendChild(btnLogout);

    // render appointments
    panel.style.display = "block";
    authWarning.style.display = "none";

    // resolve teacher document id (handles older teachers created with random doc ids)
    const teacherDoc = await findTeacherDocForUser(
      user.uid,
      userSnap.data().email
    );
    console.log("Resolved teacherDoc:", teacherDoc);
    if (!teacherDoc) {
      panel.style.display = "none";
      authWarning.style.display = "block";
      authWarning.textContent =
        "Teacher profile not found. Please contact admin to create/assign your teacher profile.";
      return;
    }

    // 🔥 ALWAYS use auth UID for appointments
    const teacherUid = user.uid;
    const teacherDocId = teacherDoc.id; // still useful for old data

    console.log("Using teacher UID:", teacherUid);
    console.log("Using teacher Doc ID:", teacherDocId);

    await renderTeacherPanel(teacherUid, teacherDocId);
    // await renderTeacherPanel(teacherUid);
  } catch (err) {
    console.error("Teacher auth check failed:", err);
    panel.style.display = "none";
    authWarning.style.display = "block";
  }
});
