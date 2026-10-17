/**
 * Vizito — Indian input validation rules (single source of truth)
 * Compliant with VALIDATION_RULES.md
 * Identical copy maintained in vizito-partner-main and vizito-patient-web.
 */

export interface ValidationResult<T = string> {
  ok: boolean;
  value: T;
  message: string;
}

export interface ValidatorOptions {
  required?: boolean;
}

// ---------------------------------------------------------------------------
// Verhoeff Algorithm Tables (for Aadhaar checksum validation)
// ---------------------------------------------------------------------------
const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

const VERHOEFF_INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

/**
 * Validates a numeric string using the Verhoeff algorithm.
 */
export function validateVerhoeff(numStr: string): boolean {
  if (!/^\d+$/.test(numStr)) return false;
  let c = 0;
  const digits = numStr.split('').reverse().map(Number);
  for (let i = 0; i < digits.length; i++) {
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][digits[i]]];
  }
  return c === 0;
}

/**
 * Computes the Verhoeff check digit for an 11-digit string.
 */
export function computeVerhoeff(numStr: string): number {
  let c = 0;
  const digits = numStr.split('').reverse().map(Number);
  for (let i = 0; i < digits.length; i++) {
    c = VERHOEFF_D[c][VERHOEFF_P[(i + 1) % 8][digits[i]]];
  }
  return VERHOEFF_INV[c];
}

// ---------------------------------------------------------------------------
// Mod-36 Algorithm (for GSTIN checksum validation)
// ---------------------------------------------------------------------------
const GSTIN_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Computes the 15th character (Mod-36 check character) for the first 14 characters of a GSTIN.
 */
export function computeGstinCheck(gstin14: string): string {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const val = GSTIN_CHARS.indexOf(gstin14[i]);
    if (val === -1) return '';
    const weight = i % 2 === 0 ? 1 : 2;
    const factor = val * weight;
    sum += Math.floor(factor / 36) + (factor % 36);
  }
  const checkCode = (36 - (sum % 36)) % 36;
  return GSTIN_CHARS[checkCode];
}

// ---------------------------------------------------------------------------
// Masking Helpers
// ---------------------------------------------------------------------------

/**
 * Mask Aadhaar: displays as "XXXX XXXX 1234".
 */
export function maskAadhaar(val: unknown): string {
  const digits = String(val ?? '').replace(/\D/g, '');
  if (digits.length <= 4) return digits;
  const last4 = digits.slice(-4);
  return `XXXX XXXX ${last4}`;
}

/**
 * Mask Bank Account: displays as "XXXXXX1234" (shows only the last 4 digits).
 */
export function maskBankAccount(val: unknown): string {
  const digits = String(val ?? '').replace(/\D/g, '');
  if (digits.length <= 4) return digits;
  const last4 = digits.slice(-4);
  const maskedPrefix = 'X'.repeat(Math.max(6, digits.length - 4));
  return `${maskedPrefix}${last4}`;
}

// ---------------------------------------------------------------------------
// Individual Validators
// ---------------------------------------------------------------------------

/**
 * Mobile
 * Rule: strip spaces/dashes; drop leading +91, 91 (if 12 digits) or 0;
 * ^[6-9]\d{9}$; reject all-same digits (e.g. 9999999999).
 */
export function validateMobile(
  raw: unknown,
  options?: ValidatorOptions
): ValidationResult<string> {
  const msg = 'Enter a 10-digit mobile number starting with 6, 7, 8 or 9.';
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    if (options?.required === false) return { ok: true, value: '', message: '' };
    return { ok: false, value: '', message: msg };
  }

  let cleaned = String(raw).trim().replace(/[\s-]/g, '');
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }

  cleaned = cleaned.replace(/\D/g, '');

  if (!/^[6-9]\d{9}$/.test(cleaned)) {
    return { ok: false, value: cleaned, message: msg };
  }

  // Reject all-same digits (e.g. 9999999999, 8888888888)
  if (/^(\d)\1{9}$/.test(cleaned)) {
    return { ok: false, value: cleaned, message: msg };
  }

  return { ok: true, value: cleaned, message: '' };
}

/**
 * Landline (business only)
 * Rule: strip spaces/dashes/brackets; ^0\d{2,4}\d{6,8}$, total 10–11 digits (STD + number).
 */
export function validateLandline(
  raw: unknown,
  options?: ValidatorOptions
): ValidationResult<string> {
  const msg = 'Enter the landline with STD code, e.g. 040 2345 6789.';
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    if (options?.required === false) return { ok: true, value: '', message: '' };
    return { ok: false, value: '', message: msg };
  }

  let cleaned = String(raw).trim().replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+91')) cleaned = cleaned.slice(3);
  if (cleaned.startsWith('91') && cleaned.length > 11) cleaned = cleaned.slice(2);
  cleaned = cleaned.replace(/\D/g, '');

  if (!cleaned.startsWith('0')) {
    return { ok: false, value: cleaned, message: msg };
  }

  if (cleaned.length < 10 || cleaned.length > 11) {
    return { ok: false, value: cleaned, message: msg };
  }

  if (!/^0\d{2,4}\d{6,8}$/.test(cleaned)) {
    return { ok: false, value: cleaned, message: msg };
  }

  // Reject all identical digits after leading 0
  if (/^0(\d)\1+$/.test(cleaned)) {
    return { ok: false, value: cleaned, message: msg };
  }

  return { ok: true, value: cleaned, message: '' };
}

/**
 * Phone (mobile or landline)
 * Rule: mobile or landline.
 */
export function validatePhone(
  raw: unknown,
  options?: ValidatorOptions
): ValidationResult<string> {
  const msg = 'Enter a 10-digit mobile or a landline with STD code.';
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    if (options?.required === false) return { ok: true, value: '', message: '' };
    return { ok: false, value: '', message: msg };
  }

  const mobRes = validateMobile(raw, { required: true });
  if (mobRes.ok) return mobRes;

  const landRes = validateLandline(raw, { required: true });
  if (landRes.ok) return landRes;

  return { ok: false, value: String(raw).trim(), message: msg };
}

/**
 * Emergency number
 * Rule: 112, 108, 102, 100, 101 or a valid phone.
 */
export function validateEmergencyNumber(
  raw: unknown,
  options?: ValidatorOptions
): ValidationResult<string> {
  const msg = 'Enter 108 / 112 or a valid phone number.';
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    if (options?.required === false) return { ok: true, value: '', message: '' };
    return { ok: false, value: '', message: msg };
  }

  const cleaned = String(raw).trim().replace(/[\s-]/g, '');
  const digits = cleaned.replace(/\D/g, '');

  if (['112', '108', '102', '100', '101'].includes(digits)) {
    return { ok: true, value: digits, message: '' };
  }

  const phoneRes = validatePhone(raw, { required: true });
  if (phoneRes.ok) return phoneRes;

  return { ok: false, value: cleaned, message: msg };
}

/**
 * Email
 * Rule: trim, lowercase; ^[^\s@]+@[^\s@]+\.[a-z]{2,}$, max 254.
 */
export function validateEmail(
  raw: unknown,
  options?: ValidatorOptions
): ValidationResult<string> {
  const msg = 'Enter a valid email, e.g. name@example.com.';
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    if (options?.required === false) return { ok: true, value: '', message: '' };
    return { ok: false, value: '', message: msg };
  }

  const cleaned = String(raw).trim().toLowerCase();
  if (cleaned.length > 254) {
    return { ok: false, value: cleaned, message: msg };
  }

  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(cleaned)) {
    return { ok: false, value: cleaned, message: msg };
  }

  return { ok: true, value: cleaned, message: '' };
}

/**
 * PIN code
 * Rule: digits; ^[1-9]\d{5}$.
 */
export function validatePinCode(
  raw: unknown,
  options?: ValidatorOptions
): ValidationResult<string> {
  const msg = 'Enter a 6-digit PIN code.';
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    if (options?.required === false) return { ok: true, value: '', message: '' };
    return { ok: false, value: '', message: msg };
  }

  const cleaned = String(raw).trim().replace(/\D/g, '');
  if (!/^[1-9]\d{5}$/.test(cleaned)) {
    return { ok: false, value: cleaned, message: msg };
  }

  return { ok: true, value: cleaned, message: '' };
}

/**
 * Aadhaar
 * Rule: strip spaces/dashes; ^[2-9]\d{11}$ + Verhoeff checksum.
 */
export function validateAadhaar(
  raw: unknown,
  options?: ValidatorOptions
): ValidationResult<string> {
  const msg = 'Enter a valid 12-digit Aadhaar number.';
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    if (options?.required === false) return { ok: true, value: '', message: '' };
    return { ok: false, value: '', message: msg };
  }

  const cleaned = String(raw).trim().replace(/[\s-]/g, '');
  if (!/^[2-9]\d{11}$/.test(cleaned)) {
    return { ok: false, value: cleaned, message: msg };
  }

  if (!validateVerhoeff(cleaned)) {
    return { ok: false, value: cleaned, message: msg };
  }

  return { ok: true, value: cleaned, message: '' };
}

/**
 * PAN
 * Rule: uppercase; ^[A-Z]{3}[ABCFGHLJPT][A-Z]\d{4}[A-Z]$ (4th char = holder type; P = person).
 */
export function validatePan(
  raw: unknown,
  options?: ValidatorOptions
): ValidationResult<string> {
  const msg = 'Enter a valid PAN, e.g. ABCPE1234F.';
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    if (options?.required === false) return { ok: true, value: '', message: '' };
    return { ok: false, value: '', message: msg };
  }

  const cleaned = String(raw).trim().toUpperCase();
  if (!/^[A-Z]{3}[ABCFGHLJPT][A-Z]\d{4}[A-Z]$/.test(cleaned)) {
    return { ok: false, value: cleaned, message: msg };
  }

  return { ok: true, value: cleaned, message: '' };
}

/**
 * GSTIN
 * Rule: uppercase; ^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$;
 * state code 01–38; chars 3–12 = PAN; mod-36 checksum on the last char.
 */
export function validateGstin(
  raw: unknown,
  options?: ValidatorOptions
): ValidationResult<string> {
  const msg = 'Enter a valid 15-character GSTIN.';
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    if (options?.required === false) return { ok: true, value: '', message: '' };
    return { ok: false, value: '', message: msg };
  }

  const cleaned = String(raw).trim().toUpperCase();
  if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(cleaned)) {
    return { ok: false, value: cleaned, message: msg };
  }

  // Validate state code (01 - 38)
  const stateCode = parseInt(cleaned.slice(0, 2), 10);
  if (stateCode < 1 || stateCode > 38) {
    return { ok: false, value: cleaned, message: msg };
  }

  // Chars 3-12 must be a valid PAN format
  const panPart = cleaned.slice(2, 12);
  const panRes = validatePan(panPart, { required: true });
  if (!panRes.ok) {
    return { ok: false, value: cleaned, message: msg };
  }

  // Mod-36 checksum
  const expectedCheck = computeGstinCheck(cleaned.slice(0, 14));
  if (cleaned[14] !== expectedCheck) {
    return { ok: false, value: cleaned, message: msg };
  }

  return { ok: true, value: cleaned, message: '' };
}

/**
 * IFSC
 * Rule: uppercase; ^[A-Z]{4}0[A-Z0-9]{6}$.
 */
export function validateIfsc(
  raw: unknown,
  options?: ValidatorOptions
): ValidationResult<string> {
  const msg = 'Enter a valid IFSC, e.g. SBIN0001234.';
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    if (options?.required === false) return { ok: true, value: '', message: '' };
    return { ok: false, value: '', message: msg };
  }

  const cleaned = String(raw).trim().toUpperCase();
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleaned)) {
    return { ok: false, value: cleaned, message: msg };
  }

  return { ok: true, value: cleaned, message: '' };
}

/**
 * Bank account no.
 * Rule: strip spaces; ^\d{9,18}$; "confirm account number" must match.
 */
export function validateBankAccount(
  raw: unknown,
  options?: ValidatorOptions & { confirmValue?: unknown }
): ValidationResult<string> {
  const msg = 'Enter a 9–18 digit account number.';
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    if (options?.required === false) return { ok: true, value: '', message: '' };
    return { ok: false, value: '', message: msg };
  }

  const cleaned = String(raw).trim().replace(/[\s-]/g, '');
  if (!/^\d{9,18}$/.test(cleaned)) {
    return { ok: false, value: cleaned, message: msg };
  }

  if (options?.confirmValue !== undefined) {
    const confirmCleaned = String(options.confirmValue).trim().replace(/[\s-]/g, '');
    if (cleaned !== confirmCleaned) {
      return { ok: false, value: cleaned, message: 'Account numbers do not match.' };
    }
  }

  return { ok: true, value: cleaned, message: '' };
}

/**
 * UPI ID
 * Rule: trim, lowercase; ^[a-z0-9.\-_]{2,256}@[a-z][a-z0-9]{2,64}$.
 */
export function validateUpiId(
  raw: unknown,
  options?: ValidatorOptions
): ValidationResult<string> {
  const msg = 'Enter a valid UPI ID, e.g. name@okaxis.';
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    if (options?.required === false) return { ok: true, value: '', message: '' };
    return { ok: false, value: '', message: msg };
  }

  const cleaned = String(raw).trim().toLowerCase();
  if (!/^[a-z0-9.\-_]{2,256}@[a-z][a-z0-9]{2,64}$/.test(cleaned)) {
    return { ok: false, value: cleaned, message: msg };
  }

  return { ok: true, value: cleaned, message: '' };
}

/**
 * Doctor reg. no.
 * Rule: trim, uppercase; 4–20 chars [A-Z0-9/\-.]; at least 3 digits; council required alongside.
 */
export function validateDoctorRegNo(
  raw: unknown,
  options?: ValidatorOptions & { council?: unknown }
): ValidationResult<string> {
  const msg = 'Enter the registration number from your council certificate.';
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    if (options?.required === false) return { ok: true, value: '', message: '' };
    return { ok: false, value: '', message: msg };
  }

  const cleaned = String(raw).trim().toUpperCase();
  if (cleaned.length < 4 || cleaned.length > 20) {
    return { ok: false, value: cleaned, message: msg };
  }

  if (!/^[A-Z0-9/\-.]+$/.test(cleaned)) {
    return { ok: false, value: cleaned, message: msg };
  }

  const digitCount = (cleaned.match(/\d/g) || []).length;
  if (digitCount < 3) {
    return { ok: false, value: cleaned, message: msg };
  }

  if (options?.council !== undefined) {
    const councilStr = String(options.council).trim();
    if (!councilStr) {
      return { ok: false, value: cleaned, message: 'Please select or enter the state medical council.' };
    }
  }

  return { ok: true, value: cleaned, message: '' };
}

/**
 * Nurse reg. no.
 * Rule: same as doctor reg. no.
 */
export function validateNurseRegNo(
  raw: unknown,
  options?: ValidatorOptions & { council?: unknown }
): ValidationResult<string> {
  return validateDoctorRegNo(raw, options);
}

/**
 * Drug licence (pharmacy)
 * Rule: trim, uppercase; 5–30 chars [A-Z0-9/\-] (formats vary by state, e.g. TS/HYD/2023/12345, 20B-12345).
 */
export function validateDrugLicence(
  raw: unknown,
  options?: ValidatorOptions
): ValidationResult<string> {
  const msg = 'Enter the drug licence number as on the licence.';
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    if (options?.required === false) return { ok: true, value: '', message: '' };
    return { ok: false, value: '', message: msg };
  }

  const cleaned = String(raw).trim().toUpperCase();
  if (cleaned.length < 5 || cleaned.length > 30) {
    return { ok: false, value: cleaned, message: msg };
  }

  if (!/^[A-Z0-9/\-]+$/.test(cleaned)) {
    return { ok: false, value: cleaned, message: msg };
  }

  return { ok: true, value: cleaned, message: '' };
}

/**
 * Lab NABL cert.
 * Rule: trim, uppercase; optional; ^[A-Z]{1,2}-?\d{3,5}$ (e.g. MC-2345).
 */
export function validateNablCert(
  raw: unknown,
  options?: ValidatorOptions
): ValidationResult<string> {
  const msg = 'Enter the NABL certificate number, e.g. MC-2345.';
  const isRequired = options?.required === true;
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    if (!isRequired) return { ok: true, value: '', message: '' };
    return { ok: false, value: '', message: msg };
  }

  const cleaned = String(raw).trim().toUpperCase();
  if (!/^[A-Z]{1,2}-?\d{3,5}$/.test(cleaned)) {
    return { ok: false, value: cleaned, message: msg };
  }

  return { ok: true, value: cleaned, message: '' };
}

/**
 * Hospital/clinic reg. (CEA)
 * Rule: trim; 4–40 chars.
 */
export function validateHospitalReg(
  raw: unknown,
  options?: ValidatorOptions
): ValidationResult<string> {
  const msg = 'Enter the registration number as on the certificate.';
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    if (options?.required === false) return { ok: true, value: '', message: '' };
    return { ok: false, value: '', message: msg };
  }

  const cleaned = String(raw).trim();
  if (cleaned.length < 4 || cleaned.length > 40) {
    return { ok: false, value: cleaned, message: msg };
  }

  return { ok: true, value: cleaned, message: '' };
}

export const validateHospitalRegNo = validateHospitalReg;
export const validateLabNabl = validateNablCert;

/**
 * Person name
 * Rule: trim, collapse spaces; 2–80 chars; letters (incl. Indian scripts), space, . ' -
 */
export function validatePersonName(
  raw: unknown,
  options?: ValidatorOptions
): ValidationResult<string> {
  const msg = 'Enter the name as on the ID.';
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    if (options?.required === false) return { ok: true, value: '', message: '' };
    return { ok: false, value: '', message: msg };
  }

  const cleaned = String(raw).trim().replace(/\s+/g, ' ');

  if (cleaned.length < 2 || cleaned.length > 80) {
    return { ok: false, value: cleaned, message: msg };
  }

  if (!/^[\p{L}\p{M} .'-]+$/u.test(cleaned)) {
    return { ok: false, value: cleaned, message: msg };
  }

  if (!/\p{L}/u.test(cleaned)) {
    return { ok: false, value: cleaned, message: msg };
  }

  return { ok: true, value: cleaned, message: '' };
}

/**
 * Date of birth
 * Rule: not in the future; age 0–120; doctors/staff ≥ 18.
 */
export function validateDob(
  raw: unknown,
  options?: ValidatorOptions & { minAge?: number; maxAge?: number }
): ValidationResult<string> {
  const msg = 'Enter a valid date of birth.';
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    if (options?.required === false) return { ok: true, value: '', message: '' };
    return { ok: false, value: '', message: msg };
  }

  const cleaned = String(raw).trim();
  const dateObj = new Date(cleaned);

  if (isNaN(dateObj.getTime())) {
    return { ok: false, value: cleaned, message: msg };
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  if (dateObj > today) {
    return { ok: false, value: cleaned, message: msg };
  }

  let age = today.getFullYear() - dateObj.getFullYear();
  const m = today.getMonth() - dateObj.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dateObj.getDate())) {
    age--;
  }

  const minAge = options?.minAge ?? 0;
  const maxAge = options?.maxAge ?? 120;

  if (age < minAge || age > maxAge) {
    return { ok: false, value: cleaned, message: msg };
  }

  const isoDate = dateObj.toISOString().slice(0, 10);
  return { ok: true, value: isoDate, message: '' };
}

/**
 * Amount (₹)
 * Rule: ≥ 0, max 2 decimals, sensible max per field.
 */
export function validateAmount(
  raw: unknown,
  options?: ValidatorOptions & { min?: number; max?: number }
): ValidationResult<number> {
  const msg = 'Enter a valid amount.';
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    if (options?.required === false) return { ok: true, value: 0, message: '' };
    return { ok: false, value: 0, message: msg };
  }

  const cleaned = String(raw).trim().replace(/,/g, '');
  const num = Number(cleaned);

  if (isNaN(num)) {
    return { ok: false, value: 0, message: msg };
  }

  if (!/^\d+(\.\d{1,2})?$/.test(cleaned) && num !== 0) {
    return { ok: false, value: num, message: msg };
  }

  const min = options?.min ?? 0;
  const max = options?.max ?? 10000000;

  if (num < min || num > max) {
    return { ok: false, value: num, message: msg };
  }

  return { ok: true, value: Math.round(num * 100) / 100, message: '' };
}

/**
 * Look up Indian State by 6-digit PIN code prefix.
 * Returns the state name or null if unmapped.
 */
export function lookupStateByPincode(pin: unknown): string | null {
  const digits = String(pin ?? '').replace(/\D/g, '');
  if (digits.length < 2) return null;
  const p2 = parseInt(digits.slice(0, 2), 10);
  const p3 = digits.length >= 3 ? parseInt(digits.slice(0, 3), 10) : 0;

  if (p2 === 11) return 'Delhi';
  if (p2 >= 12 && p2 <= 13) return 'Haryana';
  if (p3 === 160) return 'Chandigarh';
  if (p2 >= 14 && p2 <= 16) return 'Punjab';
  if (p2 === 17) return 'Himachal Pradesh';
  if (p2 >= 18 && p2 <= 19) return 'Jammu and Kashmir';
  if ((p3 >= 248 && p3 <= 249) || p3 === 263) return 'Uttarakhand';
  if (p2 >= 20 && p2 <= 28) return 'Uttar Pradesh';
  if (p2 >= 30 && p2 <= 34) return 'Rajasthan';
  if (p2 >= 36 && p2 <= 39) return 'Gujarat';
  if (p3 === 403) return 'Goa';
  if (p2 >= 40 && p2 <= 44) return 'Maharashtra';
  if (p2 === 49) return 'Chhattisgarh';
  if (p2 >= 45 && p2 <= 48) return 'Madhya Pradesh';
  if (p2 === 50) return 'Telangana';
  if (p2 >= 51 && p2 <= 53) return 'Andhra Pradesh';
  if (p2 >= 56 && p2 <= 59) return 'Karnataka';
  if (p3 === 605) return 'Puducherry';
  if (p2 >= 60 && p2 <= 64) return 'Tamil Nadu';
  if (digits.startsWith('682555')) return 'Lakshadweep'; // only this PIN; other 682xxx (Kochi) are Kerala
  if (p2 >= 67 && p2 <= 69) return 'Kerala';
  if (p3 >= 744 && p3 <= 745) return 'Andaman and Nicobar Islands';
  if (p2 >= 70 && p2 <= 74) return 'West Bengal';
  if (p2 >= 75 && p2 <= 77) return 'Odisha';
  if (p2 === 78) return 'Assam';
  if (p3 >= 790 && p3 <= 792) return 'Arunachal Pradesh';
  if (p3 >= 793 && p3 <= 794) return 'Meghalaya';
  if (p3 === 795) return 'Manipur';
  if (p3 === 796) return 'Mizoram';
  if (p3 === 797) return 'Nagaland';
  if (p3 === 799) return 'Tripura';
  if (p3 === 737) return 'Sikkim';
  if (p2 >= 80 && p2 <= 85) return 'Bihar';
  if (p2 >= 81 && p2 <= 83) return 'Jharkhand';
  if (p3 >= 396 && p3 <= 397) return 'Dadra and Nagar Haveli and Daman and Diu';
  if (p3 >= 194 && p3 <= 195) return 'Ladakh';

  return null;
}


