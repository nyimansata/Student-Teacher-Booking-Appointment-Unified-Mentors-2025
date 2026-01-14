# Test Cases

1. Register as Student

- Steps: Register with role=student -> Login -> Book appointment -> Verify appointment created in Firestore

2. Register as Teacher (Immediate)

- Steps: Register with role=teacher -> Verify user role stored as 'teacher' and teacher doc created
- Teacher can sign in immediately and access the Teacher page; Admin can view appointments to approve/reject

3. Admin approves/rejects registrations

- Steps: Admin views pending list -> Approve/Reject -> Verify role change and logs

4. Teacher CRUD (Admin)

- Add teacher via Admin panel -> Verify appears in teacher list
- Delete teacher -> Verify removed

5. Logging

- Each action should create a `logs` entry. Admin can view logs in admin panel.

6. Security rules

- Ensure non-admin cannot read other users or view logs by attempting reads from non-admin account (use Emulator or Firestore rules test)

7. Appointment lifecycle

- Student books appointment -> Teacher/Admin approves or cancels -> Verify status updates
