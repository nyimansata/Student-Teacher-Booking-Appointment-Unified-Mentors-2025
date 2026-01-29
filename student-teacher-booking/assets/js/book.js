import { initFirebase } from "../../src/services/firebase.js";
import { onAuthStateChanged, logoutUser } from "../../src/services/auth.js";
import { listTeachers, renderTeacherList } from "../../src/services/teacher.js";

// Initialize Firebase
initFirebase();

const content = document.getElementById("teachers-list"); // Corrected to target 'teachers-list'
const nav = document.getElementById("nav");

// Create logout button
const btnLogout = document.createElement("button");
btnLogout.textContent = "Logout";
btnLogout.id = "btn-logout";
btnLogout.classList.add("btn-logout"); // Add a class for potential styling
btnLogout.style.display = "none"; // Initially hide the logout button

// Append the logout button to the nav immediately
nav.appendChild(btnLogout);

onAuthStateChanged(async (user) => {
  if (user && (!user.profile || user.profile.role === "student")) {
    // Only proceed if a user is logged in AND is a student
    btnLogout.style.display = "block"; // Make logout button visible

    // Render teacher list
    try {
      const teachers = await listTeachers();
      if (teachers && teachers.length > 0) {
        renderTeacherList(teachers, content); // Render teachers into the 'teachers-list' div
      } else {
        content.textContent = "No teachers found at the moment.";
      }
    } catch (err) {
      console.error("Failed to load teachers:", err);
      content.textContent = "Failed to load teacher list. Please try again later.";
    }

    btnLogout.addEventListener("click", async () => {
      await logoutUser();
      window.location.href = "../../../index.html"; // Redirect to index after logout
    });
  } else {
    // If no user or not a student, hide logout button and redirect to index.html
    btnLogout.style.display = "none";
    window.location.href = "../../../index.html";
  }
});
