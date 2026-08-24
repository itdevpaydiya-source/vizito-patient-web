// Single shared formatter for displaying a doctor's name across the patient app. Prefixes "Dr."
// unless the name already has one. Never fabricates a name — a missing name returns null so
// callers can render their own "not available" state instead of a fake placeholder.
export const formatDoctorName = (name?: string | null): string | null => {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  return /^dr\.?\s/i.test(trimmed) ? trimmed : `Dr. ${trimmed}`;
};
