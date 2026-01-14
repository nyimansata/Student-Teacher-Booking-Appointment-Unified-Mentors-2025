# System Architecture

## High-level

- Client: Single-page app (HTML/CSS/JS) using Firebase client SDK
- Backend: Firebase Authentication (Auth) and Firestore database
- Hosting: Firebase Hosting

## Data model (collections)

- users: {name, email, role}
- teachers: {name, department, subject, email}
- appointments: {studentId, teacherId, when, purpose, status}
- logs: {userId, action, details, ts}

## Notes on optimization

- Index frequent query fields (e.g., teacherId in appointments)
- Use Firestore security rules to reduce unauthorized reads

## Admin & security notes

- Admins can approve/reject pending teacher registrations and manage teacher records
- Firestore rules include checks so only admins (role == 'admin') can read/write other users and view logs
