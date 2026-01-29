import {
  initFirebase,
  firebaseStatus,
  getFirestoreDB,
} from "../../src/services/firebase.js";
import { onAuthStateChanged, logoutUser } from "../../src/services/auth.js";
import { listLogs } from "../../src/services/admin.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// Admin sidebar with navigation
document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.createElement("aside");
  sidebar.className = "admin-sidebar";

  sidebar.innerHTML = `
    <h2>Admin</h2>
    <a href="./admin.html">Dashboard</a>
    <a href="./teachers.html">Teachers</a>
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

initFirebase();

try {
  const s = firebaseStatus();
  if (!s.auth || !s.db) {
    console.warn("Firebase not fully configured. Admin features may not work.");
  }
} catch (e) {
  console.warn("firebaseStatus check failed", e);
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

// Load logs on page load
refreshLogs();

// Set up refresh button
const btnRefreshLogs = document.getElementById("btn-refresh-logs");
if (btnRefreshLogs) {
  btnRefreshLogs.addEventListener("click", async () => {
    const logsContainer = document.getElementById("logs");
    logsContainer.innerHTML = "Refreshing...";
    await refreshLogs();
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
