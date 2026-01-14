# Low Level Design (LLD)

## Collections and Schemas

users

- id (uid)
- name
- email
- role (admin | student | teacher)
- createdAt

teachers

- id
- name
- department
- subject
- email
- createdAt

appointments

- id
- studentId
- teacherId
- when (string / ISO)
- purpose
- status (pending | approved | cancelled)
- createdAt

logs

- id
- userId
- action
- details
- ts

## API-like functions (client-side)

- registerUser()
- loginUser()
- addTeacher(), updateTeacher(), deleteTeacher()
- bookAppointment(), approveAppointment(), cancelAppointment(), listAllAppointments()
- logAction()
- Admin: listPendingTeachers(), approveTeacherRegistration(), rejectTeacherRegistration(), listLogs(), listAllAppointments()
