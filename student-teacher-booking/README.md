# Student-Teacher Booking Appointment System

**Technologies:** HTML, CSS, JavaScript, Firebase (Auth, Firestore, Hosting)

## Project overview

A simple web-based appointment booking system for students and teachers with an Admin panel. Features include:

- Role-based authentication (Admin / Teacher / Student)
- Teacher CRUD (Admin)
- Approve teacher registrations (Admin)
- Search and book appointments (Student)
- Approve/cancel appointments (Teacher/Admin)
- Messages between users
- Logging/audit trail (stored in Firestore)

## Project structure

- `index.html` - Single-page app UI for auth/login and dashboards
- `assets/css/styles.css` - Styles
- `assets/js/app.js` - SPA controller
- `src/services/firebase.js` - Firebase initialization (fill in your config)
- `src/services/auth.js` - Authentication utilities
- `src/services/teacher.js` - Teacher CRUD functions
- `src/services/appointments.js` - Appointment functions
- `src/services/logger.js` - Logging utilities
- `docs/` - architecture, LLD and report templates
- `tests/` - unit tests for shared utils

## Quick start

1. Create a Firebase project (https://console.firebase.google.com)
2. Enable **Authentication** (Email/Password) and **Firestore**
3. Replace `firebaseConfig` in `src/services/firebase.js` with your project config
4. Serve `index.html` (open in browser) or deploy to Firebase Hosting

## Notes

- This scaffold contains working modular code for the client-side flows. You need to populate Firebase config and set security rules in `firestore.rules`.
- Logging is done by writing to a Firestore `logs` collection.

---

See `docs/` for more details about architecture, LLD, wireframes, and reporting.

#

add a admin user in auth with username and password then add a document for admin in user using the same id in the admin.
