import { isValidIndianMobile, sanitizeMobileInput } from './identifier';

/**
 * Validates whether a given string is a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.
 * Compliant with VALIDATION_RULES.md (delegates to shared identifier helper).
 */
export const validateIndianMobile = (num: string): boolean => {
  return isValidIndianMobile(num);
};

/**
 * Sanitizes user input for Indian mobile number fields:
 * - Keeps only digits (0-9).
 * - Limits length to max 10 digits.
 * - Prevents typing a first digit that is not 6, 7, 8, or 9.
 */
export const sanitizeIndianMobile = (val: string): string => {
  return sanitizeMobileInput(val);
};

