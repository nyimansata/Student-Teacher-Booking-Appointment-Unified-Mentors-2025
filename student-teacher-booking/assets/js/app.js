import { initFirebase, firebaseStatus } from "../../src/services/firebase.js";
import {
  registerUser,
  loginUser,
  onAuthStateChanged,
  authDiagnostics,
  signInWithGoogle,
} from "../../src/services/auth.js";

initFirebase(); // 🔥 MUST run before auth.js logic

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

// The onAuthStateChanged listener in app.js now solely handles redirections based on user role
// and showing/hiding the authentication section.
onAuthStateChanged(async (user) => {
  const authSection = document.getElementById("auth-section");
  const nav = document.getElementById("nav"); // Get nav here if needed, but only for clearing if logged out.

  if (user) {
    // If a user is logged in
    authSection.style.display = "none"; // Hide the authentication forms

    // Redirect based on user role
    if (!user.profile || user.profile.role === "student") {
      window.location.href = "src/pages/find-book-teacher/book.html";
      return;
    } else if (user.profile && user.profile.role === "teacher") {
      window.location.href = "src/pages/teacher/teacher.html";
      return;
    } else if (user.profile && user.profile.role === "admin") {
      window.location.href = "src/pages/admin/admin.html";
      return;
    }
  } else {
    // If no user is logged in, show the authentication section
    authSection.style.display = "block";
    // Ensure the nav is empty on index.html when logged out, as user-specific buttons are not needed here.
    if (nav) {
      nav.innerHTML = "";
    }
  }
});
