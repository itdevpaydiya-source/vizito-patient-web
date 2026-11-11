// "Did you mean …?" for common email domain misspellings. Only a hint: the user decides, and
// nothing is blocked (a real but unusual domain must still be accepted).
const DOMAIN_FIXES: Record<string, string> = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gmil.com': 'gmail.com',
  'gamil.com': 'gmail.com', 'gnail.com': 'gmail.com', 'gmaill.com': 'gmail.com', 'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com', 'gmail.cm': 'gmail.com', 'gmail.om': 'gmail.com', 'gmail.cmo': 'gmail.com', 'gmail.comm': 'gmail.com',
  'gmail.in': 'gmail.com', 'gmail.co.in': 'gmail.com',
  'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'yhoo.com': 'yahoo.com', 'yahoo.con': 'yahoo.com', 'yahoo.cm': 'yahoo.com',
  'yaho.co.in': 'yahoo.co.in', 'yahoo.co.on': 'yahoo.co.in', 'yahoo.coin': 'yahoo.co.in', 'yahoo.in': 'yahoo.co.in',
  'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotmil.com': 'hotmail.com', 'hotmail.con': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outllok.com': 'outlook.com', 'outook.com': 'outlook.com', 'outlook.con': 'outlook.com', 'otlook.com': 'outlook.com',
  'rediffmal.com': 'rediffmail.com', 'redifmail.com': 'rediffmail.com', 'rediff.com': 'rediffmail.com',
  'icloud.co': 'icloud.com', 'iclod.com': 'icloud.com', 'icoud.com': 'icloud.com',
};

/** Returns the corrected address when the domain looks like a typo of a common provider, else null. */
export function suggestEmailFix(value: string): string | null {
  const email = String(value || '').trim().toLowerCase();
  const at = email.lastIndexOf('@');
  if (at < 1 || at === email.length - 1) return null;
  const domain = email.slice(at + 1);
  const fixed = DOMAIN_FIXES[domain];
  return fixed && fixed !== domain ? `${email.slice(0, at)}@${fixed}` : null;
}
