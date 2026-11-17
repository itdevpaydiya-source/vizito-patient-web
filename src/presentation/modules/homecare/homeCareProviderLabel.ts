// Who provides a home care service, in words a patient can trust.
// `vizito_verified` is the BUSINESS check (Vizito approved the account), never proof of a person's
// nursing/physio credentials, so it is never worded as a credential claim here.

type Category = 'NURSING' | 'PHYSIOTHERAPY' | string;

const roleWord = (category: Category, count = 1) => {
  const one = category === 'NURSING' ? 'nurse' : category === 'PHYSIOTHERAPY' ? 'physiotherapist' : 'caregiver';
  return count === 1 ? one : `${one}s`;
};

export const isIndividualProvider = (agency: { mode?: string | null; homecare_mode?: string | null }) =>
  agency.mode === 'INDIVIDUAL' || agency.homecare_mode === 'INDIVIDUAL';

/** "Individual nurse" for a one-person provider; "3 nurses (credentials checked by the agency)" for an agency. */
export function providerLabel(x: { category: Category; professionals?: number | null; agency: { mode?: string | null; homecare_mode?: string | null } }): string {
  if (isIndividualProvider(x.agency)) return `Individual ${roleWord(x.category)}`;
  const n = Number(x.professionals) || 0;
  return `${n} ${roleWord(x.category, n)} (credentials checked by the agency)`;
}
