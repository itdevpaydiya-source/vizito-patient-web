import { describe, expect, it } from 'vitest';
import { expand, highlight, searchHomeCare } from './careSearchLogic';
import type { HcService } from '../../../services/homecareHelper';
import type { HomeVisitDoctor } from '../../../services/labHelper';

const svc = (id: string, category: HcService['category'], name: string, kind: 'VISIT' | 'SHIFT' = 'VISIT', price = 600): HcService => ({
  id, category, category_label: category, kind, name, description: null, includes: null, duration_minutes: 30, shift_hours: kind === 'SHIFT' ? 12 : null,
  price, required_role: 'NURSE', professionals: 2, avg_experience: 3,
  agency: { id: `a-${id}`, name: 'CareShield Nursing', registration_number: null, about: null, hours: '', day_open: '08:00', day_close: '20:00', rating: null, ratings: 0 },
});
const doc: HomeVisitDoctor = { doctor_partner_id: 'd1', name: 'Dr. Sekhar', qualification: 'MBBS', specialization: 'General Medicine', experience: 4, fee: 800, visit_minutes: 60, pincodes: ['500084'] };
const services = [
  svc('1', 'NURSING', 'Injection / IV at home'),
  svc('2', 'NURSING', 'Wound dressing', 'VISIT', 750),
  svc('3', 'NURSING', 'Nursing care · 12-hour day shift', 'SHIFT', 1600),
  svc('4', 'PHYSIOTHERAPY', 'Physiotherapy session', 'VISIT', 700),
  svc('5', 'CAREGIVER', 'Patient attendant · 12-hour shift', 'SHIFT', 900),
];

describe('home care search', () => {
  it('finds the exact service and suggests related care', () => {
    const r = searchHomeCare(services, [doc], 'injection');
    expect(r.exact.map((h) => h.key)).toEqual(['s:1']);
    expect(r.related.map((h) => h.key)).toEqual(expect.arrayContaining(['s:2', 's:3', 'd:d1']));
    expect(r.related.some((h) => h.key === 's:4')).toBe(false);
  });
  it('understands synonyms people type', () => {
    expect(searchHomeCare(services, [doc], 'drip').exact.map((h) => h.key)).toEqual(['s:1']);
    expect(searchHomeCare(services, [doc], 'physio').exact.map((h) => h.key)).toEqual(['s:4']);
    expect(searchHomeCare(services, [doc], 'aaya').exact.map((h) => h.key)).toEqual(['s:5']);
    expect(searchHomeCare(services, [doc], 'fever').exact.map((h) => h.key)).toEqual(['d:d1']);
    expect(searchHomeCare(services, [doc], 'sekhar').exact.map((h) => h.key)).toEqual(['d:d1']);
  });
  it('12-hour finds both shifts; empty query returns everything', () => {
    expect(searchHomeCare(services, [doc], '12 hour').exact.map((h) => h.key).sort()).toEqual(['s:3', 's:5']);
    expect(searchHomeCare(services, [doc], '').exact).toHaveLength(6);
  });
  it('no match still gives related care by topic', () => {
    const r = searchHomeCare(services, [doc], 'insulin shot for diabetes');
    expect(r.exact.length + r.related.length).toBeGreaterThan(0);
  });
  it('highlights the matched word', () => {
    expect(highlight('Injection / IV at home', 'injection')).toEqual(['', 'Injection', ' / IV at home']);
    expect(highlight('Physiotherapy session', 'physio')).toEqual(['', 'Physiotherapy', ' session']);
    expect(expand('')).toEqual([]);
  });
});
