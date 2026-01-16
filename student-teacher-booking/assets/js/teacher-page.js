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

// async function renderTeacherPanel(
//   // teacherDocId,
//   teacherUserId
//   //  = null
// ) {
//   // const appointmentsContainer = document.getElementById("teacher-appointments");
//   // appointmentsContainer.innerHTML = "";
//   // const tmpl = document.getElementById("teacher-appointment");
//   // // const appts = await getAppointmentsForTeacher(teacherDocId, teacherUserId);
//   // const appts = await getAppointmentsForTeacher(teacherUserId);
//   // console.log("Appointments fetched:", appts && appts.length, appts);
//   // if (!appts || appts.length === 0) {
//   //   appointmentsContainer.textContent = "No appointment requests yet.";
//   //   return;
//   // }
//   const appointmentsContainer = document.getElementById("teacher-appointments");
//   appointmentsContainer.innerHTML = "";

//   const tmpl = document.getElementById("teacher-appointment");

//   const appts = await getAppointmentsForTeacher(teacherUid);
//   console.log("Appointments fetched:", appts.length, appts);

//   if (appts.length === 0) {
//     appointmentsContainer.textContent = "No appointment requests yet.";
//     return;
//   }
//   appts.forEach((a) => {
//     const node = tmpl.content.cloneNode(true);
//     const el = node.querySelector(".appointment-card");
//     el.querySelector(".student-name").textContent =
//       a.studentName || a.studentId;
//     el.querySelector(".appointment-when").textContent = a.when || "";
//     el.querySelector(".appointment-purpose").textContent = `Purpose: ${
//       a.purpose || ""
//     }`;
//     el.querySelector(".appointment-status").textContent = `Status: ${
//       a.status || "pending"
//     }`;

//     const btnApprove = el.querySelector(".btn-approve-appt");
//     const btnCancel = el.querySelector(".btn-cancel-appt");

//     btnApprove.addEventListener("click", async () => {
//       try {
//         await approveAppointment(a.id);
//         showSuccessModal("Appointment approved ✅");
//         await renderTeacherPanel(teacherDocId, teacherUserId);
//       } catch (err) {
//         console.error(err);
//         alert(err.message || "Approve failed");
//       }
//     });

//     // Reject appointment (uses confirm modal)
//     btnCancel.textContent = "Reject";
//     btnCancel.addEventListener("click", async () => {
//       const confirmModal = document.getElementById("confirm-modal");
//       const msg = confirmModal.querySelector("#confirm-message");
//       const btnCancelConfirm = confirmModal.querySelector("#confirm-cancel");
//       const btnConfirm = confirmModal.querySelector("#confirm-delete");

//       msg.textContent =
//         "Reject this appointment? This will mark it as rejected.";
//       btnConfirm.textContent = "Reject";
//       confirmModal.classList.add("show");

//       btnCancelConfirm.onclick = () => confirmModal.classList.remove("show");

//       btnConfirm.onclick = async () => {
//         try {
//           await import("../../src/services/appointments.js").then((m) =>
//             m.rejectAppointment(a.id)
//           );
//           confirmModal.classList.remove("show");
//           showSuccessModal("Appointment rejected ❌");
//           // await renderTeacherPanel(teacherDocId, teacherUserId);
//           await renderTeacherPanel(teacherUserId);
//         } catch (err) {
//           console.error(err);
//           alert(err.message || "Reject failed");
//           confirmModal.classList.remove("show");
//         }
//       };
//     });

//     appointmentsContainer.appendChild(el);
//   });
// }

async function renderTeacherPanel(
  teacherUid
  // teacherDocId
) {
  const appointmentsContainer = document.getElementById("teacher-appointments");
  appointmentsContainer.innerHTML = "";

  const tmpl = document.getElementById("teacher-appointment");

  // const appts = await getAppointmentsForTeacher(teacherUid);
  // const appts = await getAppointmentsForTeacher(teacherUid, teacherDocId);
  const appts = await getAppointmentsForTeacher(teacherUid);
  console.log(teacherUid, "this is me");

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
      await renderTeacherPanel(teacherUid); // ✅ correct
    };

    btnCancel.onclick = async () => {
      await cancelAppointment(a.id);
      await renderTeacherPanel(teacherUid); // ✅ correct
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

    // link teacher doc to user's UID if not already linked
    // if (!teacherDoc.data.userId) {
    //   try {
    //     await linkTeacherDocToUser(teacherDoc.id, user.uid);
    //   } catch (err) {
    //     console.warn("Could not link teacher doc to user:", err);
    //   }
    // }

    //

    // 🔥 ALWAYS use auth UID for appointments
    // 🔥 ALWAYS use auth UID for appointments
    const teacherUid = user.uid; // ✅ FIX
    const teacherDocId = teacherDoc.id; // still useful for old data

    console.log("Using teacher UID:", teacherUid);
    console.log("Using teacher Doc ID:", teacherDocId);

    await renderTeacherPanel(teacherUid, teacherDocId);
    // await renderTeacherPanel(teacherUid);

    // const teacherUserId = teacherDoc.data.userId || null;
    // await renderTeacherPanel(teacherDoc.id, teacherUserId);
    // await renderTeacherPanel(teacherUserId);
  } catch (err) {
    console.error("Teacher auth check failed:", err);
    panel.style.display = "none";
    authWarning.style.display = "block";
  }
});
