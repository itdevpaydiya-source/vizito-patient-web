/**
 * Validates whether a given string is a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.
 */
export const validateIndianMobile = (num: string): boolean => {
  if (!num) return false;
  const clean = num.trim().replace(/\D/g, '');
  return /^[6-9]\d{9}$/.test(clean);
};

/**
 * Sanitizes user input for Indian mobile number fields:
 * - Keeps only digits (0-9).
 * - Limits length to max 10 digits.
 * - Prevents typing a first digit that is not 6, 7, 8, or 9.
 */
export const sanitizeIndianMobile = (val: string): string => {
  let cleaned = val.replace(/\D/g, '');
  if (cleaned.length > 0) {
    // Ensure first character is 6, 7, 8, or 9
    if (!/^[6-9]/.test(cleaned)) {
      // Find the first 6-9 digit if user typed invalid leading digit(s)
      const firstValidIdx = cleaned.search(/[6-9]/);
      if (firstValidIdx !== -1) {
        cleaned = cleaned.slice(firstValidIdx);
      } else {
        cleaned = '';
      }
    }
  }
  return cleaned.slice(0, 10);
};
