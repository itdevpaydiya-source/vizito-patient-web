import { describe, expect, it } from 'vitest';
import { canonicalSpecialty, normalizeSpecialtyLabel, specialtyKey } from './specialties';

describe('TC-33 specialization deduplication utilities', () => {
  it('merges Orthopedist and orthopedic variants into one canonical Orthopedic key', () => {
    expect(canonicalSpecialty('Orthopedist')).toBe('Orthopedic');
    expect(canonicalSpecialty('orthopedic')).toBe('Orthopedic');
    expect(normalizeSpecialtyLabel('  ORTHOPEDIST  ')).toBe('Orthopedic');
    expect(specialtyKey('Orthopedist')).toBe(specialtyKey('orthopedic'));
  });

  it('produces identical keys for whitespace and case variants of un-listed specializations', () => {
    expect(normalizeSpecialtyLabel('  Pain   Management ')).toBe('Pain Management');
    expect(specialtyKey('  Pain   Management ')).toBe(specialtyKey('pain management'));
  });
});

