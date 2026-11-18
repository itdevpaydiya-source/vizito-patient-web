/**
 * Home care search: one query over everything that can come to the patient's home in their area —
 * agency services (nursing, physiotherapy, attendants) and doctors who make home visits.
 * Returns EXACT matches (the words the patient typed, incl. common Indian synonyms) and RELATED
 * results (the same kind of care, or care usually needed with it).
 */
import type { HcCategory, HcService } from '../../../services/homecareHelper';
import type { HomeVisitDoctor } from '../../../services/labHelper';

export type CareType = HcCategory | 'DOCTOR';
export type SearchHit =
  | { type: 'service'; key: string; care: CareType; s: HcService; score: number }
  | { type: 'doctor'; key: string; care: 'DOCTOR'; d: HomeVisitDoctor; score: number };

export const CARE_LABEL: Record<CareType, string> = { NURSING: 'Nursing', PHYSIOTHERAPY: 'Physiotherapy', CAREGIVER: 'Attendant', DOCTOR: 'Doctor at home' };
export const CARE_TAB: Record<HcCategory, string> = { NURSING: 'nursing', PHYSIOTHERAPY: 'physio', CAREGIVER: 'caregiver' };

/** Words people type → words found in service names / descriptions. */
const SYNONYMS: Record<string, string[]> = {
  injection: ['injection', 'iv', 'drip', 'shot', 'jab', 'insulin', 'cannula'],
  iv: ['iv', 'injection', 'drip', 'cannula'],
  drip: ['drip', 'iv', 'injection'],
  wound: ['wound', 'dressing', 'bandage', 'bedsore', 'ulcer', 'stitches', 'suture'],
  dressing: ['dressing', 'wound', 'bandage'],
  nurse: ['nurse', 'nursing'],
  nursing: ['nursing', 'nurse'],
  physio: ['physiotherapy', 'physio', 'rehab', 'exercise'],
  physiotherapy: ['physiotherapy', 'physio', 'rehab'],
  rehab: ['rehab', 'physiotherapy', 'stroke', 'surgery'],
  stroke: ['stroke', 'rehab', 'physiotherapy'],
  surgery: ['surgery', 'post-surgery', 'rehab'],
  'back pain': ['back pain', 'physiotherapy'],
  attendant: ['attendant', 'caregiver', 'carer', 'aaya', 'ayah', 'helper'],
  caregiver: ['caregiver', 'attendant', 'carer'],
  elder: ['elder', 'elderly', 'senior', 'old age', 'attendant'],
  elderly: ['elder', 'elderly', 'senior', 'attendant'],
  'live-in': ['live-in', '24-hour', '24 hour'],
  '24': ['24-hour', '24 hour', 'live-in'],
  '12': ['12-hour', '12 hour', 'shift'],
  doctor: ['doctor', 'dr', 'gp', 'physician', 'consultation'],
  fever: ['doctor', 'fever'],
  prescription: ['doctor', 'prescription'],
  checkup: ['doctor', 'checkup', 'check-up'],
};
/** Care usually needed together with / instead of a kind of care. */
const RELATED_CARE: Record<CareType, CareType[]> = {
  NURSING: ['NURSING', 'DOCTOR', 'CAREGIVER'],
  PHYSIOTHERAPY: ['PHYSIOTHERAPY', 'CAREGIVER', 'DOCTOR'],
  CAREGIVER: ['CAREGIVER', 'NURSING'],
  DOCTOR: ['DOCTOR', 'NURSING'],
};
const DOCTOR_WORDS = ['doctor', 'dr', 'gp', 'physician', 'consultation', 'fever', 'prescription', 'checkup', 'check-up', 'medicine', 'general medicine'];

const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
const STOP = new Set(['at', 'for', 'the', 'a', 'an', 'of', 'in', 'on', 'to', 'and', 'my', 'me', 'near', 'home', 'need', 'want', 'with', 'from', 'please', 'service', 'services']);
/** A word counts when some word in the text STARTS with it ("physio" → "physiotherapy", but "iv" ≠ "caregiver"). */
const hasWord = (text: string, w: string) => {
  for (let i = text.indexOf(w); i >= 0; i = text.indexOf(w, i + 1)) if (i === 0 || !/[a-z0-9]/.test(text[i - 1])) return true;
  return false;
};
/** Each typed word → the set of words that count as a match for it. */
export function expand(query: string): string[][] {
  const q = norm(query);
  if (!q) return [];
  const words = q.split(' ').filter((w) => (w.length > 1 || /\d/.test(w)) && !STOP.has(w));
  const out: string[][] = [];
  const phrase = Object.keys(SYNONYMS).find((k) => k.includes(' ') && q.includes(k));
  if (phrase) out.push(SYNONYMS[phrase]);
  for (const w of words) {
    if (phrase && phrase.split(' ').includes(w)) continue;
    // The word itself, plus every synonym list it belongs to (as a key, a prefix of a key, or a member).
    const lists = Object.entries(SYNONYMS).filter(([k, v]) => k === w || v.includes(w) || (w.length >= 4 && (k.startsWith(w) || w.startsWith(k))));
    out.push(Array.from(new Set([w, ...lists.flatMap(([, v]) => v)])));
  }
  return out;
}

const serviceText = (s: HcService) => norm(`${s.name} ${s.category_label || ''} ${CARE_LABEL[s.category]} ${s.description || ''} ${s.includes || ''} ${s.agency.name} ${s.kind === 'SHIFT' ? `${s.shift_hours || ''}-hour shift` : 'visit'}`);
const doctorText = (d: HomeVisitDoctor) => norm(`${d.name} ${d.specialization || ''} ${d.qualification || ''} doctor home visit consultation ${DOCTOR_WORDS.join(' ')}`);
const nameText = (s: HcService) => norm(s.name);

/** Every group must match somewhere; a match in the service NAME scores higher. */
function scoreOf(groups: string[][], text: string, name: string, all = true): number {
  let score = 0;
  for (const g of groups) {
    const inName = g.some((w) => hasWord(name, w));
    const inText = inName || g.some((w) => hasWord(text, w));
    if (!inText) { if (all) return 0; continue; }
    score += inName ? 3 : 1;
  }
  return score;
}

export function searchHomeCare(services: HcService[], doctors: HomeVisitDoctor[], query: string): { exact: SearchHit[]; related: SearchHit[] } {
  const groups = expand(query);
  const all: SearchHit[] = [
    ...services.map((s): SearchHit => ({ type: 'service', key: `s:${s.id}`, care: s.category, s, score: 0 })),
    ...doctors.map((d): SearchHit => ({ type: 'doctor', key: `d:${d.doctor_partner_id}`, care: 'DOCTOR', d, score: 0 })),
  ];
  if (!groups.length) return { exact: all, related: [] };
  const exact = all
    .map((h) => ({ ...h, score: h.type === 'service' ? scoreOf(groups, serviceText(h.s), nameText(h.s)) : scoreOf(groups, doctorText(h.d), norm(h.d.name)) }))
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score);
  // Nothing matches every word: what matches SOME words leads the related results.
  const partial = exact.length ? [] : all
    .map((h) => ({ ...h, score: h.type === 'service' ? scoreOf(groups, serviceText(h.s), nameText(h.s), false) : scoreOf(groups, doctorText(h.d), norm(h.d.name), false) }))
    .filter((h) => h.score > 0).sort((a, b) => b.score - a.score);
  // Related: the kinds of care linked to what matched (or, with no match, to the words typed).
  const matchedCare = new Set<CareType>([...exact, ...partial].map((h) => h.care));
  if (!matchedCare.size) {
    const q = norm(query);
    if (DOCTOR_WORDS.some((w) => q.includes(w))) matchedCare.add('DOCTOR');
    if (/nurs|inject|iv|wound|dress/.test(q)) matchedCare.add('NURSING');
    if (/physio|rehab|stroke|pain|surgery/.test(q)) matchedCare.add('PHYSIOTHERAPY');
    if (/attend|care|elder|senior|aaya/.test(q)) matchedCare.add('CAREGIVER');
  }
  const relatedCare = new Set<CareType>(Array.from(matchedCare).flatMap((c) => RELATED_CARE[c]));
  const taken = new Set([...exact, ...partial].map((h) => h.key));
  const rest = all.filter((h) => !taken.has(h.key) && relatedCare.has(h.care))
    .sort((a, b) => (matchedCare.has(b.care) ? 1 : 0) - (matchedCare.has(a.care) ? 1 : 0));
  return { exact, related: [...partial, ...rest] };
}

/** Split a title so the typed word can be highlighted: [before, match, after]. */
export function highlight(text: string, query: string): [string, string, string] {
  const groups = expand(query);
  const lower = text.toLowerCase();
  for (const g of groups) for (const w of [...g].sort((a, b) => b.length - a.length)) {
    if (w.length < 2) continue;
    // First place the word starts a word in the title (words are already letters, digits, spaces, hyphens).
    for (let i = lower.indexOf(w); i >= 0; i = lower.indexOf(w, i + 1)) {
      if (i === 0 || !/[a-z0-9]/.test(lower[i - 1])) return [text.slice(0, i), text.slice(i, i + w.length), text.slice(i + w.length)];
    }
  }
  return [text, '', ''];
}

export const hitPrice = (h: SearchHit) => (h.type === 'service' ? h.s.price : h.d.fee);
/** Minutes from now until the earliest start (Infinity when unknown). */
export const hitSoonest = (h: SearchHit, now = Date.now()) => {
  const at = h.type === 'service' ? h.s.earliest_start : h.d.next_slot;
  if (!at) return Infinity;
  const t = Date.parse(`${at.date}T${at.time}:00+05:30`);
  return Number.isFinite(t) ? (t - now) / 60000 : Infinity;
};
