// Mirrors the backend rule in vizito-auth identity.validators.ts: every path that SETS a
// password (sign-up, reset, change, staff accounts) uses this. Login never checks it, so
// accounts created under the old 6-character rule can still sign in.
export const PASSWORD_POLICY_MESSAGE =
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number and a symbol.';

export const isStrongPassword = (value: string): boolean =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,100}$/.test(value || '');
