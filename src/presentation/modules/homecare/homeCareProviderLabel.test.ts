import { describe, expect, it } from 'vitest';
import { providerLabel } from './homeCareProviderLabel';

describe('providerLabel', () => {
  it('an Individual is named by role and never claims verified credentials, even on a Vizito-verified account', () => {
    const label = providerLabel({ category: 'NURSING', professionals: 1, agency: { mode: 'INDIVIDUAL' } });
    expect(label).toBe('Individual nurse');
    const verified = providerLabel({ category: 'PHYSIOTHERAPY', agency: { homecare_mode: 'INDIVIDUAL', vizito_verified: true } as any });
    expect(verified).toBe('Individual physiotherapist');
    expect(verified).not.toMatch(/verified|credential/i);
  });

  it('an unverified Individual caregiver gets the same plain label', () => {
    expect(providerLabel({ category: 'CAREGIVER', agency: { mode: 'INDIVIDUAL', vizito_verified: false } as any })).toBe('Individual caregiver');
  });

  it('an agency shows its checked-staff count, singular and plural', () => {
    expect(providerLabel({ category: 'NURSING', professionals: 1, agency: { mode: 'AGENCY' } })).toBe('1 nurse (credentials checked by the agency)');
    expect(providerLabel({ category: 'NURSING', professionals: 3, agency: {} })).toBe('3 nurses (credentials checked by the agency)');
  });
});
