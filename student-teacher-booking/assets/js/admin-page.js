import {
  initFirebase,
  firebaseStatus,
  getFirestoreDB,
} from "../../src/services/firebase.js";
import { onAuthStateChanged, logoutUser } from "../../src/services/auth.js";
import {
  listPendingTeachers,
  approveTeacherRegistration,
  rejectTeacherRegistration,
  listLogs,
  showSuccessModal,
} from "../../src/services/admin.js";
import {
  listTeachers,
  renderAdminTeacherList,
  addTeacher as addTeacherService,
} from "../../src/services/teacher.js";
import {
  listAllAppointments,
  approveAppointment,
  cancelAppointment,
} from "../../src/services/appointments.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

initFirebase();

try {
  const s = firebaseStatus();
  if (!s.auth || !s.db) {
    console.warn("Firebase not fully configured. Admin features may not work.");
  }
} catch (e) {
  console.warn("firebaseStatus check failed", e);
}

async function renderAdminPanel() {
  // pending registrations
  const pending = await listPendingTeachers();
  const pendingList = document.getElementById("pending-list");
  pendingList.innerHTML = "";
  const tmpl = document.getElementById("pending-teacher");
  pending.forEach((p) => {
    const node = tmpl.content.cloneNode(true);
    node.querySelector(".pending-name").textContent = p.name || "";
    node.querySelector(".pending-email").textContent = p.email || "";
    node.querySelector(".btn-approve").addEventListener("click", async () => {
      const dept = prompt("Department (optional)");
      const subject = prompt("Subject (optional)");
      try {
        await approveTeacherRegistration(p.id, { department: dept, subject });
        node.remove();
        alert("Teacher approved");
        refreshTeacherList();
        refreshLogs();
      } catch (err) {
        console.error(err);
        alert(err.message || "Approval failed");
      }
    });
    node.querySelector(".btn-reject").addEventListener("click", async () => {
      if (!confirm("Reject registration?")) return;
      try {
        await rejectTeacherRegistration(p.id);
        node.remove();
        alert("Teacher registration rejected");
        refreshLogs();
      } catch (err) {
        console.error(err);
        alert(err.message || "Reject failed");
      }
    });
    pendingList.appendChild(node);
  });

  // teachers
  refreshTeacherList();

  // appointments
  refreshAppointments();

  // logs
  refreshLogs();
}

async function refreshAppointments() {
  const list = await listAllAppointments();
  const container = document.getElementById("appointments-list");
  container.innerHTML = "";
  const tmpl = document.getElementById("admin-appointment");
  list.forEach((a) => {
    const node = tmpl.content.cloneNode(true);
    node.querySelector(".student-name").textContent =
      a.studentName || a.studentId;
    node.querySelector(".appointment-teacher").textContent = `Teacher: ${
      a.teacherDocId || a.teacherId || ""
    }`;
    node.querySelector(".appointment-when").textContent = a.when || "";
    node.querySelector(".appointment-purpose").textContent = `Purpose: ${
      a.purpose || ""
    }`;
    node.querySelector(".appointment-status").textContent = `Status: ${
      a.status || "pending"
    }`;

    const btnApprove = node.querySelector(".btn-approve-appt");
    const btnCancel = node.querySelector(".btn-cancel-appt");

    btnApprove.addEventListener("click", async () => {
      try {
        await approveAppointment(a.id);
        showSuccessModal("Appointment approved ");
        refreshAppointments();
        refreshLogs();
      } catch (err) {
        console.error(err);
        alert(err.message || "Approve failed");
      }
    });

    btnCancel.addEventListener("click", async () => {
      if (!confirm("Cancel this appointment?")) return;
      try {
        await cancelAppointment(a.id);
        showSuccessModal("Appointment cancelled ");
        refreshAppointments();
        refreshLogs();
      } catch (err) {
        console.error(err);
        alert(err.message || "Cancel failed");
      }
    });

    container.appendChild(node);
  });
}

const btnRefreshAppointments = document.getElementById(
  "btn-refresh-appointments",
);
if (btnRefreshAppointments) {
  btnRefreshAppointments.addEventListener("click", async () => {
    const c = document.getElementById("appointments-list");
    c.innerHTML = "Refreshing...";
    await refreshAppointments();
  });
}

async function refreshTeacherList() {
  const tList = await listTeachers();
  renderAdminTeacherList(tList, document.getElementById("admin-teacher-list"));
  // admin-teacher-list
}

async function refreshLogs() {
  const logs = await listLogs(50);
  const logsContainer = document.getElementById("logs");
  logsContainer.innerHTML = "";
  logs.forEach((l) => {
    const el = document.createElement("div");
    // handle serverTimestamp vs plain timestamp
    const ts =
      l.ts && l.ts.seconds
        ? new Date(l.ts.seconds * 1000)
        : new Date(l.ts || Date.now());
    el.textContent = `${ts.toLocaleString()} - ${l.userId || "-"} - ${
      l.action
    } - ${JSON.stringify(l.details || {})}`;
    logsContainer.appendChild(el);
  });
}

// Respond to deletions triggered from the teacher renderer
document.addEventListener("teacher-deleted", (e) => {
  // refresh UI and logs
  refreshTeacherList();
  refreshLogs();
  showSuccessModal("Teacher deleted successfully ");
});

// Respond to approvals
document.addEventListener("teacher-approved", (e) => {
  refreshTeacherList();
  refreshLogs();
  showSuccessModal("Teacher approved successfully ");
});

// Respond to updates
document.addEventListener("teacher-updated", (e) => {
  refreshTeacherList();
  refreshLogs();
  showSuccessModal("Teacher updated successfully ");
});

// wire up add teacher
document
  .querySelectorAll(
    "#new-teacher-name, #new-teacher-email, #new-teacher-dept, #new-teacher-subject",
  )
  .forEach((input) => {
    input.addEventListener("input", () => {
      input.classList.remove("input-error");
    });
  });

const btnAddTeacher = document.getElementById("btn-add-teacher");

if (btnAddTeacher) {
  btnAddTeacher.addEventListener("click", async () => {
    const nameInput = document.getElementById("new-teacher-name");
    const emailInput = document.getElementById("new-teacher-email");
    const deptInput = document.getElementById("new-teacher-dept");
    const subjectInput = document.getElementById("new-teacher-subject");

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const dept = deptInput.value.trim();
    const subject = subjectInput.value.trim();

    let hasError = false;

    const validate = (input, value) => {
      if (!value) {
        input.classList.add("input-error");
        hasError = true;
      }
    };

    validate(nameInput, name);
    validate(emailInput, email);
    validate(deptInput, dept);
    validate(subjectInput, subject);

    if (hasError) return;

    try {
      await addTeacherService({ name, email, department: dept, subject });

      // reset values
      nameInput.value = "";
      emailInput.value = "";
      deptInput.value = "";
      subjectInput.value = "";

      //  remove red borders explicitly
      nameInput.classList.remove("input-error");
      emailInput.classList.remove("input-error");
      deptInput.classList.remove("input-error");
      subjectInput.classList.remove("input-error");

      refreshTeacherList();
      refreshLogs();
      showSuccessModal("Teacher added successfully ");
    } catch (err) {
      console.error(err);
      alert(err.message || "Add teacher failed");
    }
  });
}

onAuthStateChanged(async (user) => {
  const panel = document.getElementById("admin-panel");
  const authWarning = document.getElementById("auth-warning");

  if (!user) {
    panel.style.display = "none";
    authWarning.style.display = "block";
    return;
  }

  try {
    const db = getFirestoreDB();
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error("User profile not found in Firestore");
    }

    const role = userSnap.data().role;
    console.log("Logged in role:", role);

    if (role === "admin") {
      authWarning.style.display = "none";
      panel.style.display = "block";
      renderAdminPanel();
    } else {
      panel.style.display = "none";
      authWarning.style.display = "block";
    }
  } catch (err) {
    console.error("Admin auth check failed:", err);
    panel.style.display = "none";
    authWarning.style.display = "block";
  }
});

// Admin sidebar with navigation
document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.createElement("aside");
  sidebar.className = "admin-sidebar";

  sidebar.innerHTML = `
    <h2>Admin</h2>
    <a href="./admin.html">Dashboard</a>
    <a href="./book.html">Available Teachers</a>
    <a href="./appointments.html">Appointments</a>
    <a href="./audit-logs.html">Audit Logs</a>
    <button id="sidebar-logout-btn" style="margin-top: auto;">Logout</button>
  `;

  document.body.prepend(sidebar);

  // Add logout functionality
  const logoutBtn = document.getElementById("sidebar-logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await logoutUser();
        window.location.href = "../../../index.html";
      } catch (err) {
        console.error("Logout failed:", err);
        window.location.href = "../../../index.html";
      }
    });
  }
});
