// Mirrors the backend rule in vizito-auth identity.validators.ts: every path that SETS a
// password (sign-up, reset, change, staff accounts) uses this. Login never checks it, so
// accounts created under the old 6-character rule can still sign in.
export const PASSWORD_POLICY_MESSAGE =
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number and a symbol.';

export const isStrongPassword = (value: string): boolean =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,100}$/.test(value || '');

// The same rules as a checklist, shown live while the person types.
export const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { label: 'An uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'A lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { label: 'A number', test: (v: string) => /[0-9]/.test(v) },
  { label: 'A symbol (e.g. ! @ # $)', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];
