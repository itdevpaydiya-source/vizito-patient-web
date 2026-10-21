/**
 * Shared Identifier & Mobile/Email Validation Helper
 * Single source of truth for identifier fields across the application.
 */

export type IdentifierType = 'mobile' | 'email' | 'unknown';

export interface IdentifierValidation {
  isValid: boolean;
  type: IdentifierType;
  normalized: string;
  error: string;
}

export const IDENTIFIER_MESSAGES = {
  mobileError: 'Enter a valid 10-digit mobile number.',
  emailError: 'Enter a valid email address.',
  required: 'Please enter your mobile number or email',
  pastedCut: 'Mobile number limited to 10 digits',
  normalizedPaste: 'Normalized to 10-digit mobile number',
  MOBILE_INVALID: 'Enter a valid 10-digit mobile number.',
  EMAIL_INVALID: 'Enter a valid email address.',
  REQUIRED: 'Please enter your mobile number or email',
  PASTED_CUT: 'Mobile number limited to 10 digits',
  NORMALIZED_PASTE: 'Normalized to 10-digit mobile number',
};

/**
 * Detects whether an identifier value looks like a mobile number or an email.
 * Rule: Only digits, '+', spaces, or dashes means mobile.
 * A letter or '@' means email.
 * Anything else or empty means unknown.
 */
export function detectIdentifier(value: string): IdentifierType {
  if (!value || !value.trim()) return 'unknown';
  const trimmed = value.trim();

  // A letter or '@' indicates email intent
  if (/[a-zA-Z@]/.test(trimmed)) {
    return 'email';
  }

  // Only digits, '+', spaces, and dashes means mobile
  if (/^[0-9+\s-]+$/.test(trimmed) && /\d/.test(trimmed)) {
    return 'mobile';
  }

  return 'unknown';
}

/**
 * Extracts digits from a mobile candidate after stripping +91, 91 (when 12 digits), or 0.
 */
export function extractMobileDigits(value: string): string {
  if (!value) return '';
  let cleaned = String(value).trim().replace(/[\s-]/g, '');
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }
  return cleaned.replace(/\D/g, '');
}

/**
 * Normalizes a mobile number:
 * Strip spaces and dashes, plus leading +91, 91 (when 12 digits) or 0, and return 10 digits.
 */
export function normalizeMobile(value: string): string {
  const digits = extractMobileDigits(value);
  return digits.slice(0, 10);
}

/**
 * Validates an Indian mobile number:
 * Must be exactly 10 digits and start with 6, 7, 8, or 9.
 */
export function isValidIndianMobile(value: string): boolean {
  if (!value) return false;
  const digits = extractMobileDigits(value);
  return /^[6-9]\d{9}$/.test(digits);
}

/**
 * Validates an email address:
 * Trimmed, name@domain.tld, at most 254 characters.
 */
export function isValidEmail(value: string): boolean {
  if (!value) return false;
  const trimmed = String(value).trim();
  if (trimmed.length === 0 || trimmed.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(trimmed);
}

/**
 * Validates an identifier (mobile or email) in one pass.
 */
export function validateIdentifier(value: string, isRequired = true): IdentifierValidation {
  const trimmed = (value || '').trim();
  if (!trimmed) {
    return {
      isValid: !isRequired,
      type: 'unknown',
      normalized: '',
      error: isRequired ? IDENTIFIER_MESSAGES.required : '',
    };
  }

  const type = detectIdentifier(trimmed);

  if (type === 'email') {
    const valid = isValidEmail(trimmed);
    return {
      isValid: valid,
      type: 'email',
      normalized: trimmed.toLowerCase(),
      error: valid ? '' : IDENTIFIER_MESSAGES.emailError,
    };
  }

  if (type === 'mobile') {
    const valid = isValidIndianMobile(trimmed);
    return {
      isValid: valid,
      type: 'mobile',
      normalized: normalizeMobile(trimmed),
      error: valid ? '' : IDENTIFIER_MESSAGES.mobileError,
    };
  }

  return {
    isValid: false,
    type: 'unknown',
    normalized: trimmed,
    error: IDENTIFIER_MESSAGES.mobileError,
  };
}

/**
 * Sanitizes input for dedicated Indian mobile number fields:
 * - Keeps only digits.
 * - Stops accepting digits after 10.
 * - First digit must be 6-9 (drops invalid leading digits).
 */
export function sanitizeMobileInput(val: string): string {
  let cleaned = String(val).replace(/\D/g, '');
  if (cleaned.length > 0) {
    if (!/^[6-9]/.test(cleaned)) {
      const firstValidIdx = cleaned.search(/[6-9]/);
      if (firstValidIdx !== -1) {
        cleaned = cleaned.slice(firstValidIdx);
      } else {
        cleaned = '';
      }
    }
  }
  return cleaned.slice(0, 10);
}
