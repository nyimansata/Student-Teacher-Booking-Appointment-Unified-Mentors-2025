export function isValidEmail(e) {
  return /^\S+@\S+\.\S+$/.test(e);
}

export function isValidAppointmentTime(s) {
  // very simple ISO-ish check
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(s);
}
