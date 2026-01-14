import { initFirebase, firebaseStatus } from "../../src/services/firebase.js";
import {
  registerUser,
  loginUser,
  logoutUser,
  onAuthStateChanged,
  authDiagnostics,
  signInWithGoogle,
} from "../../src/services/auth.js";
import {
  listTeachers,
  renderTeacherList,
  renderAdminTeacherList,
} from "../../src/services/teacher.js";
import {
  listPendingTeachers,
  approveTeacherRegistration,
  rejectTeacherRegistration,
  listLogs,
} from "../../src/services/admin.js";
import { addTeacher } from "../../src/services/teacher.js";
import {
  getAppointmentsForTeacher,
  approveAppointment,
  cancelAppointment,
} from "../../src/services/appointments.js";

initFirebase(); // 🔥 MUST run before auth.js logic

// initFirebase();
// show a small banner if firebase seems unconfigured
try {
  const s = firebaseStatus();
  if (!s.auth || !s.db) {
    const banner = document.getElementById("debug-banner");
    if (banner) {
      banner.style.display = "block";
      banner.textContent =
        "Warning: Firebase does not appear to be configured correctly. Check src/services/firebase.js and the browser console for details.";
    }
  }
} catch (e) {
  console.warn("firebaseStatus check failed", e);
}

// UI bindings

// Auth diagnostics button handler
const btnAuthDiag = document.getElementById("btn-auth-diagnostics");
if (btnAuthDiag) {
  btnAuthDiag.addEventListener("click", async () => {
    btnAuthDiag.disabled = true;
    const banner = document.getElementById("debug-banner");
    const msg = document.getElementById("debug-msg");
    const originalText = btnAuthDiag.textContent;
    btnAuthDiag.textContent = "Running...";
    try {
      const res = await authDiagnostics();
      console.log("Auth diagnostics result", res);
      if (res.ok) {
        if (banner) {
          banner.style.display = "block";
          banner.style.background = "#2e7d32";
        }
        if (msg)
          msg.textContent = `Auth diagnostics: ${
            res.message || res.code || "OK"
          }`;
      } else {
        if (banner) {
          banner.style.display = "block";
          banner.style.background = "#e53935";
        }
        if (msg)
          msg.textContent = `Auth diagnostics error: ${
            res.message || res.code || "Unknown"
          }`;
      }
    } catch (err) {
      console.error("Auth diagnostics exception", err);
      if (banner) {
        banner.style.display = "block";
        banner.style.background = "#e53935";
      }
      if (msg) msg.textContent = `Diagnostics exception: ${err.message || err}`;
    } finally {
      btnAuthDiag.textContent = originalText;
      btnAuthDiag.disabled = false;
    }
  });
}
const btnRegister = document.getElementById("btn-register");
const btnLogin = document.getElementById("btn-login");
const btnLogout = document.createElement("button");
btnLogout.textContent = "Logout";
btnLogout.id = "btn-logout";
const loginDiv = document.getElementById("login");
const registerDiv = document.getElementById("register");
const showLoginLink = document.getElementById("show-login");
const showRegisterLink = document.getElementById("show-register");
const googleRegisterBtn = document.getElementById("google-register-btn");
const googleLoginBtn = document.getElementById("google-login-btn");

btnRegister.addEventListener("click", async () => {
  const name = document.getElementById("reg-name").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value;
  const role = document.getElementById("reg-role").value;
  try {
    await registerUser({ name, email, password, role });
    alert(
      "Registered — you can sign in now. If you registered as a teacher, you will have access immediately."
    );
  } catch (err) {
    console.error(err);
    alert(err.message || "Registration failed");
  }
});

btnLogin.addEventListener("click", async () => {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  try {
    await loginUser(email, password);
  } catch (err) {
    console.error(err);
    alert(err.message || "Login failed");
  }
});

// google sign up
googleRegisterBtn?.addEventListener("click", async () => {
  try {
    await signInWithGoogle();
  } catch (error) {
    alert(error.message);
  }
});

googleLoginBtn?.addEventListener("click", async () => {
  try {
    await signInWithGoogle();
  } catch (error) {
    alert(error.message);
  }
});

// show login by default
function showLogin() {
  loginDiv.style.display = "block";
  registerDiv.style.display = "none";
}

function showRegister() {
  loginDiv.style.display = "none";
  registerDiv.style.display = "block";
}

// toggle events
showLoginLink?.addEventListener("click", (e) => {
  e.preventDefault();
  showLogin();
});

showRegisterLink?.addEventListener("click", (e) => {
  e.preventDefault();
  showRegister();
});

// initial state
showLogin();

// admin
async function renderAdminPanel() {
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
      await approveTeacherRegistration(p.id, { department: dept, subject });
      node.remove();
      alert("Teacher approved");
      // refresh teacher list
      const teachers = await listTeachers();
      renderAdminTeacherList(
        teachers,
        document.getElementById("admin-teacher-list")
      );
    });
    node.querySelector(".btn-reject").addEventListener("click", async () => {
      if (confirm("Reject registration?")) {
        await rejectTeacherRegistration(p.id);
        node.remove();
        alert("Teacher registration rejected");
      }
    });
    pendingList.appendChild(node);
  });

  // show teachers for admin management
  const tList = await listTeachers();
  renderAdminTeacherList(tList, document.getElementById("admin-teacher-list"));

  // logs
  const logs = await listLogs(50);
  const logsContainer = document.getElementById("logs");
  logsContainer.innerHTML = "";
  logs.forEach((l) => {
    const el = document.createElement("div");
    el.textContent = `${new Date(
      l.ts.seconds ? l.ts.seconds * 1000 : l.ts
    ).toLocaleString()} - ${l.userId} - ${l.action} - ${JSON.stringify(
      l.details || {}
    )}`;
    logsContainer.appendChild(el);
  });
}

// Render appointments for a teacher
async function renderTeacherAppointments(teacherId) {
  const content = document.getElementById("content");
  content.innerHTML = "";
  const tmpl = document.getElementById("teacher-appointment");
  const appts = await getAppointmentsForTeacher(teacherId);
  if (!appts || appts.length === 0) {
    content.textContent = "No appointment requests yet.";
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

    btnApprove.addEventListener("click", async () => {
      try {
        await approveAppointment(a.id);
        await renderTeacherAppointments(teacherId);
      } catch (err) {
        console.error(err);
        alert(err.message || "Approve failed");
      }
    });

    btnCancel.addEventListener("click", async () => {
      if (!confirm("Cancel this appointment?")) return;
      try {
        await cancelAppointment(a.id);
        await renderTeacherAppointments(teacherId);
      } catch (err) {
        console.error(err);
        alert(err.message || "Cancel failed");
      }
    });

    content.appendChild(el);
  });
}

onAuthStateChanged(async (user) => {
  const authSection = document.getElementById("auth-section");
  const dashboard = document.getElementById("dashboard");
  const nav = document.getElementById("nav");

  if (user) {
    authSection.style.display = "none";
    dashboard.style.display = "block";
    nav.innerHTML = "";
    nav.appendChild(btnLogout);

    // show teacher list for student (default student view)
    if (!user.profile || user.profile.role === "student") {
      listTeachers().then((teachers) => {
        renderTeacherList(teachers, document.getElementById("content"));
      });
    }

    // if teacher, send to teacher page
    if (user.profile && user.profile.role === "teacher") {
      window.location.href = "src/pages/teacher/teacher.html";
      return;
    }

    // if admin, render admin panel
    if (user.profile && user.profile.role === "admin") {
      document.getElementById("admin-panel").style.display = "block";
      renderAdminPanel();
      window.location.href = "src/pages/admin/admin.html";
    }

    btnLogout.addEventListener("click", async () => {
      await logoutUser();
      location.reload();
    });
  } else {
    authSection.style.display = "block";
    dashboard.style.display = "none";
    nav.innerHTML = "";
  }
});

// admin add teacher handler
// const btnAddTeacher = document.getElementById("btn-add-teacher");
// if (btnAddTeacher) {
//   btnAddTeacher.addEventListener("click", async () => {
//     const name = document.getElementById("new-teacher-name").value.trim();
//     const email = document.getElementById("new-teacher-email").value.trim();
//     const dept = document.getElementById("new-teacher-dept").value.trim();
//     const subject = document.getElementById("new-teacher-subject").value.trim();
//     if (!name && !email && !dept && !subject)
//       return alert("Name email dept and subject is required");
//     await addTeacher({ name, email, department: dept, subject });
//     alert("Teacher added by nyima fofana");
//     const tList = await listTeachers();
//     renderAdminTeacherList(
//       tList,
//       document.getElementById("admin-teacher-list")
//     );
//   });
// }

// refresh logs button
const btnRefreshLogs = document.getElementById("btn-refresh-logs");
if (btnRefreshLogs) {
  btnRefreshLogs.addEventListener("click", async () => {
    const logsContainer = document.getElementById("logs");
    logsContainer.innerHTML = "Refreshing...";
    const logs = await listLogs(50);
    logsContainer.innerHTML = "";
    logs.forEach((l) => {
      const el = document.createElement("div");
      el.textContent = `${new Date(
        l.ts.seconds ? l.ts.seconds * 1000 : l.ts
      ).toLocaleString()} - ${l.userId} - ${l.action} - ${JSON.stringify(
        l.details || {}
      )}`;
      logsContainer.appendChild(el);
    });
  });
}
