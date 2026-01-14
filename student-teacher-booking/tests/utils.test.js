import { isValidEmail } from "../src/utils.js";

test("valid email", () => {
  expect(isValidEmail("test@example.com")).toBe(true);
});

test("invalid email", () => {
  expect(isValidEmail("not-an-email")).toBe(false);
});
