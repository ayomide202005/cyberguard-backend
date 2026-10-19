// Checks a password. Returns an error message, or null if the password is fine.
export default function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters.';
  }

  // bcrypt only uses the first 72 characters, so we do not allow more
  if (password.length > 72) {
    return 'Password must be 72 characters or fewer.';
  }

  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must include at least one letter and one number.';
  }

  return null;
}