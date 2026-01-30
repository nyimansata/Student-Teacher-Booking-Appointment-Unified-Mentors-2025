import { getFirestoreDB, getFirebaseAuth } from "./firebase.js";
import {
  collection,
  addDoc,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

export async function addTeacher({ name, department, subject, email }) {
  const db = getFirestoreDB();

  // First, create or update a user document with the 'pending_teacher' role.
  // We'll use the email to query for an existing user document.
  // If the user doesn't exist, this will create a new user document.
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("email", "==", email));
  const userSnap = await getDocs(q);

  let userId = null;
  if (!userSnap.empty) {
    // User document already exists, get its ID
    userId = userSnap.docs[0].id;
    await setDoc(doc(db, "users", userId), { role: "pending_teacher" }, { merge: true });
    console.log("Updated existing user role to pending_teacher for:", email);
  } else {
    // User document does not exist, create a new one.
    // In a real application, you might want to link this to Firebase Auth user creation.
    const newUserRef = await addDoc(usersRef, {
      email,
      name, // Assuming name is available from the form
      role: "pending_teacher",
      createdAt: new Date(),
    });
    userId = newUserRef.id;
    console.log("Created new user document with pending_teacher role for:", email, "UID:", userId);
  }

  // Then, create the teacher document (as it was before, but ensuring userId is linked)
  const docRef = await addDoc(collection(db, "teachers"), {
    name,
    department,
    subject,
    email,
    userId: userId, // Link the teacher document to the user's ID
    createdAt: new Date(),
  });
  console.log("Teacher document created with ID:", docRef.id);
  return docRef.id;
}

export async function updateTeacher(id, data) {
  const db = getFirestoreDB();
  await setDoc(doc(db, "teachers", id), data, { merge: true });
}

export async function deleteTeacher(id) {
  const db = getFirestoreDB();
  await deleteDoc(doc(db, "teachers", id));
}

export async function listTeachers() {
  const db = getFirestoreDB();
  const snap = await getDocs(collection(db, "teachers"));
  const list = [];
  snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
  return list;
}

/**
 * Find the teacher document corresponding to a signed-in user.
 * Tries in-order: userId == uid, then email == userEmail.
 * Returns { id, data } or null if not found.
 */
export async function findTeacherDocForUser(userUid, userEmail) {
  const db = getFirestoreDB();
  console.log("findTeacherDocForUser called with:", { userUid, userEmail });
  // try by userId first (new/approved teachers)
  const qByUser = query(
    collection(db, "teachers"),
    where("userId", "==", userUid),
  );
  const snap1 = await getDocs(qByUser);
  console.log("Query by userId results (snap1.empty):", snap1.empty);
  if (snap1 && !snap1.empty) {
    const d = snap1.docs[0];
    console.log("Teacher found by userId:", { id: d.id, data: d.data() });
    return { id: d.id, data: d.data() };
  }

  // fallback: try by email (older teachers added by admin)
  if (userEmail) {
    const qByEmail = query(
      collection(db, "teachers"),
      where("email", "==", userEmail),
    );
    const snap2 = await getDocs(qByEmail);
    console.log("Query by email results (snap2.empty):", snap2.empty);
    if (snap2 && !snap2.empty) {
      const d = snap2.docs[0];
      console.log("Teacher found by email:", { id: d.id, data: d.data() });
      return { id: d.id, data: d.data() };
    }
  }

  console.log("findTeacherDocForUser returning null - no teacher found.");
  return null;
}

/**
 * Link an existing teacher document to the given auth user id
 * by setting `userId` field on the teacher doc (merge).
 */
export async function linkTeacherDocToUser(teacherDocId, userUid) {
  const db = getFirestoreDB();
  await setDoc(
    doc(db, "teachers", teacherDocId),
    { userId: userUid },
    { merge: true },
  );
}

// Basic UI helper to render teachers into a container
let __bookingModalInitialized = false;
let __bookingTeacherId = null;

function setupBookingModal() {
  let bookingModal = document.getElementById("booking-modal");
  if (!bookingModal) {
    // modal not present yet — observe DOM for it (useful if DOM is mutated later)
    console.warn(
      "booking-modal not found, setting up observer to initialize when it appears",
    );
    const observer = new MutationObserver((mutations, obs) => {
      const bm = document.getElementById("booking-modal");
      if (bm) {
        obs.disconnect();
        setupBookingModal();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    // stop observing after 5s to avoid leaks
    setTimeout(() => observer.disconnect(), 5000);
    return;
  }

  // ensure modal attached to document.body to avoid z-index / stacking context issues
  if (bookingModal.parentElement !== document.body) {
    console.log(
      "Moving booking-modal to document.body to avoid stacking context issues",
    );
    document.body.appendChild(bookingModal);
  }
  // ensure it sits above everything
  bookingModal.style.position = "fixed";
  bookingModal.style.left = "0";
  bookingModal.style.top = "0";
  bookingModal.style.width = "100%";
  bookingModal.style.height = "100%";
  bookingModal.style.zIndex = "2147483647";

  const purposeInput = document.getElementById("booking-purpose");
  const whenInput = document.getElementById("booking-when");
  const submit = document.getElementById("booking-submit");
  const cancel = document.getElementById("booking-cancel");

  // defensive checks
  if (!purposeInput || !whenInput || !submit || !cancel) {
    console.warn("booking modal controls missing; will retry initialization");
    // try again shortly
    setTimeout(setupBookingModal, 200);
    return;
  }

  submit.onclick = async () => {
    const purpose = purposeInput.value.trim();
    const whenRaw = whenInput.value; // datetime-local => 'YYYY-MM-DDTHH:MM'
    const when = whenRaw ? whenRaw : "";

    if (!purpose || !when) {
      alert("Please provide both purpose and date/time");
      return;
    }

    // ensure user is signed in before attempting to book
    const auth = getFirebaseAuth();
    if (!auth || !auth.currentUser) {
      alert("Please sign in to request an appointment");
      bookingModal.classList.remove("show");
      bookingModal.style.display = "";
      return;
    }

    // fetch user profile and verify role is student to satisfy security rules and app behavior
    try {
      const db = getFirestoreDB();
      const { doc, getDoc } =
        await import("https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js");
      const udoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      const role = udoc && udoc.exists() ? udoc.data().role : null;
      console.log("Booking: current user", auth.currentUser.uid, "role", role);
      if (role && role !== "student") {
        alert(
          "Only students can request appointments. Please sign in with a student account.",
        );
        bookingModal.classList.remove("show");
        bookingModal.style.display = "";
        return;
      }
    } catch (err) {
      console.warn("Could not verify user role before booking", err);
      // continue — server rules will still enforce permissions
    }

    try {
      await import("./appointments.js").then((m) =>
        m.bookAppointment({ teacherId: __bookingTeacherId, purpose, when }),
      );
      bookingModal.classList.remove("show");
      // inline style fallback to ensure modal is hidden even if CSS conflicts
      bookingModal.style.display = "";
      const success = document.getElementById("success-modal");
      const successMsg = document.getElementById("success-message");
      if (success && successMsg) {
        successMsg.textContent = "Appointment requested ✅";
        success.classList.add("show");
        setTimeout(() => success.classList.remove("show"), 2500);
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "Request failed");
    }
  };

  cancel.onclick = () => {
    bookingModal.classList.remove("show");
    bookingModal.style.display = "";
  };

  __bookingModalInitialized = true;
  console.log("Booking modal initialized");
}

export function openBookingModal(teacherId) {
  // ensure modal is initialized; if it wasn't available earlier, set it up now
  if (!__bookingModalInitialized) setupBookingModal();

  const bookingModal = document.getElementById("booking-modal");
  const purposeInput = document.getElementById("booking-purpose");
  const whenInput = document.getElementById("booking-when");
  if (!bookingModal || !purposeInput || !whenInput) return;

  __bookingTeacherId = teacherId;
  purposeInput.value = "";
  whenInput.value = "";
  // show immediately (inline fallback) and focus the purpose input so it feels snappy
  bookingModal.style.display = "flex";
  bookingModal.classList.add("show");
  // bring to front in case of stacking context issues
  bookingModal.style.zIndex = "2147483647";
  bookingModal.style.position = "fixed";
  setTimeout(() => purposeInput.focus(), 0);
}

export function renderTeacherList(teachers, container) {
  container.innerHTML = "";
  const template = document.getElementById("teacher-card");

  // ensure modal is wired up once so opening is instant
  if (!__bookingModalInitialized) setupBookingModal();

  teachers.forEach((t) => {
    const node = template.content.cloneNode(true);
    node.querySelector(".teacher-name").textContent = t.name;
    node.querySelector(".teacher-dept").textContent = t.department || "";
    node.querySelector(".teacher-subject").textContent = t.subject || "";
    const btn = node.querySelector(".btn-book");
    btn.addEventListener("click", () => {
      console.log("Book clicked for teacher", t.id);
      // simply open modal quickly — handler already initialized
      openBookingModal(t.id);

      // small debug: check modal presence
      const bm = document.getElementById("booking-modal");
      console.log(
        "booking-modal element after click:",
        !!bm,
        bm ? bm.classList.toString() : null,
        "style.display=",
        bm ? bm.style.display : null,
      );
    });
    container.appendChild(node);
  });
}

export function renderAdminTeacherList(teachers, container) {
  container.innerHTML = "";
  const template = document.getElementById("admin-teacher-card");
  const confirmModal = document.getElementById("confirm-modal");
  teachers.forEach((t) => {
    const node = template.content.cloneNode(true);
    const el = node.querySelector(".teacher-card");
    el.querySelector(".teacher-name").textContent = t.name;
    el.querySelector(".teacher-email").textContent = t.email || "";
    el.querySelector(".teacher-dept").textContent = t.department || "";
    el.querySelector(".teacher-subject").textContent = t.subject || "";
    const btnDel = el.querySelector(".btn-delete");
    btnDel.addEventListener("click", () => {
      // If confirm modal is not present (fallback), use native confirm
      if (!confirmModal) {
        if (!confirm(`Delete teacher ${t.name}?`)) return;
        deleteTeacher(t.id)
          .then(() => {
            el.remove();
            document.dispatchEvent(
              new CustomEvent("teacher-deleted", { detail: { id: t.id } }),
            );
          })
          .catch((err) => {
            console.error(err);
            alert(err.message || "Delete failed");
          });
        return;
      }

      const msg = confirmModal.querySelector("#confirm-message");
      const btnCancel = confirmModal.querySelector("#confirm-cancel");
      const btnConfirm = confirmModal.querySelector("#confirm-delete");

      msg.textContent = `Delete teacher ${t.name}? This action cannot be undone.`;
      confirmModal.classList.add("show");

      btnCancel.onclick = () => {
        confirmModal.classList.remove("show");
      };

      btnConfirm.onclick = async () => {
        try {
          await deleteTeacher(t.id);
          confirmModal.classList.remove("show");
          el.remove();
          document.dispatchEvent(
            new CustomEvent("teacher-deleted", { detail: { id: t.id } }),
          );
        } catch (err) {
          console.error(err);
          alert(err.message || "Delete failed");
          confirmModal.classList.remove("show");
        }
      };
    });
    container.appendChild(el);
  });
}
