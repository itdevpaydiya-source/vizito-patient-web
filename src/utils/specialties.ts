// Patients rarely know a specialist's exact title, and doctors write theirs in many ways
// ("Orthopedic", "Orthopaedics", "Ortho surgeon"). One catalogue turns any of those, and common
// symptoms, into the same specialty, so filters group correctly and "tooth pain" finds a dentist.
export interface Specialty {
  name: string;          // what the filter chip shows
  words: string[];       // spellings / titles doctors use (lower-case stems)
  symptoms: string[];    // what patients type
  hint: string;          // one line for the patient
}

export const SPECIALTIES: Specialty[] = [
  { name: 'General Physician', words: ['general physician', 'general medicine', 'physician', 'family medicine', 'family physician', 'internal medicine', 'gp', 'mbbs'], symptoms: ['fever', 'cold', 'cough', 'flu', 'body pain', 'weakness', 'headache', 'infection', 'viral', 'diabetes', 'sugar', 'bp', 'blood pressure', 'thyroid'], hint: 'Fever, cold, infections, diabetes, BP and everyday illness' },
  { name: 'Pediatrician', words: ['pediatric', 'paediatric', 'child specialist', 'neonat'], symptoms: ['child', 'baby', 'kid', 'infant', 'vaccination', 'vaccine', 'newborn'], hint: 'Babies and children up to 18' },
  { name: 'Gynecologist', words: ['gynec', 'gynaec', 'obstetric', 'obgyn', 'ob-gyn', 'women'], symptoms: ['pregnancy', 'pregnant', 'periods', 'irregular periods', 'pcos', 'pcod', 'menstrual', 'fertility'], hint: 'Pregnancy, periods, PCOS and women\'s health' },
  { name: 'Dentist', words: ['dent', 'orthodont', 'endodont', 'oral', 'bds', 'mds'], symptoms: ['tooth', 'teeth', 'toothache', 'gum', 'cavity', 'braces', 'root canal', 'mouth ulcer'], hint: 'Teeth, gums, braces and root canal' },
  { name: 'Orthopedic', words: ['ortho', 'bone', 'joint replacement', 'spine surgeon', 'sports medicine'], symptoms: ['back pain', 'joint pain', 'knee pain', 'neck pain', 'shoulder pain', 'fracture', 'sprain', 'arthritis', 'bone'], hint: 'Bones, joints, back pain, fractures and sprains' },
  { name: 'Dermatologist', words: ['dermat', 'skin', 'cosmetolog', 'tricholog', 'venereolog'], symptoms: ['skin', 'rash', 'acne', 'pimple', 'itching', 'hair fall', 'dandruff', 'allergy on skin', 'eczema', 'psoriasis'], hint: 'Skin, hair, acne, rashes and itching' },
  { name: 'Cardiologist', words: ['cardio', 'heart'], symptoms: ['chest pain', 'heart', 'palpitation', 'breathless', 'cholesterol'], hint: 'Heart, chest pain, palpitations and cholesterol' },
  { name: 'ENT Specialist', words: ['ent', 'otorhinolaryng', 'otolaryng', 'ear nose'], symptoms: ['ear', 'ear pain', 'hearing', 'nose', 'sinus', 'throat', 'tonsil', 'snoring', 'vertigo'], hint: 'Ear, nose, throat, sinus and hearing' },
  { name: 'Ophthalmologist', words: ['ophthalm', 'eye', 'optometr', 'retina'], symptoms: ['eye', 'vision', 'blurred vision', 'red eye', 'cataract', 'spectacles', 'glasses'], hint: 'Eyes, vision, cataract and glasses' },
  { name: 'Gastroenterologist', words: ['gastro', 'hepatolog', 'digestive', 'liver'], symptoms: ['stomach', 'stomach pain', 'acidity', 'gas', 'constipation', 'loose motion', 'diarrhea', 'vomiting', 'liver', 'jaundice'], hint: 'Stomach, acidity, digestion and liver' },
  { name: 'Neurologist', words: ['neuro'], symptoms: ['migraine', 'seizure', 'fits', 'numbness', 'paralysis', 'stroke', 'memory loss', 'tremor'], hint: 'Brain and nerves: migraine, fits, numbness, stroke' },
  { name: 'Psychiatrist', words: ['psychiat', 'psycholog', 'mental health', 'counsel'], symptoms: ['anxiety', 'stress', 'depression', 'sleep', 'insomnia', 'panic', 'addiction'], hint: 'Stress, anxiety, depression and sleep' },
  { name: 'Pulmonologist', words: ['pulmon', 'chest physician', 'respiratory', 'lung'], symptoms: ['asthma', 'breathing', 'wheezing', 'lung', 'tb', 'tuberculosis', 'chronic cough'], hint: 'Lungs, asthma and breathing problems' },
  { name: 'Urologist', words: ['urolog', 'androlog'], symptoms: ['urine', 'urinary', 'kidney stone', 'prostate', 'burning urination'], hint: 'Urine problems, kidney stones and prostate' },
  { name: 'Nephrologist', words: ['nephro', 'kidney'], symptoms: ['kidney', 'dialysis', 'creatinine', 'swelling in legs'], hint: 'Kidney disease and dialysis' },
  { name: 'Endocrinologist', words: ['endocrin', 'diabetolog'], symptoms: ['hormone', 'thyroid', 'diabetes control', 'obesity', 'weight gain'], hint: 'Diabetes, thyroid and hormones' },
  { name: 'Oncologist', words: ['oncolog', 'cancer'], symptoms: ['cancer', 'tumour', 'tumor', 'lump', 'chemotherapy'], hint: 'Cancer care' },
  { name: 'General Surgeon', words: ['general surg', 'laparoscop', 'surgeon'], symptoms: ['hernia', 'piles', 'appendix', 'gallstone', 'surgery'], hint: 'Hernia, piles, gallstones and other operations' },
  { name: 'Physiotherapist', words: ['physio', 'rehabilit'], symptoms: ['physiotherapy', 'rehab', 'stiffness', 'posture'], hint: 'Exercise therapy after injury or surgery' },
];

/** Quick picks shown to patients who don't know which specialist they need. */
export const SYMPTOM_CHIPS: { label: string; specialty: string }[] = [
  { label: 'Fever / cold', specialty: 'General Physician' },
  { label: 'Child unwell', specialty: 'Pediatrician' },
  { label: 'Tooth pain', specialty: 'Dentist' },
  { label: 'Skin / hair', specialty: 'Dermatologist' },
  { label: 'Back / joint pain', specialty: 'Orthopedic' },
  { label: 'Stomach / acidity', specialty: 'Gastroenterologist' },
  { label: 'Pregnancy / periods', specialty: 'Gynecologist' },
  { label: 'Ear, nose, throat', specialty: 'ENT Specialist' },
  { label: 'Eye problem', specialty: 'Ophthalmologist' },
  { label: 'Chest pain / BP', specialty: 'Cardiologist' },
  { label: 'Stress / sleep', specialty: 'Psychiatrist' },
];

const norm = (s: string) => ` ${s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;

/** The catalogue specialty a doctor's written title belongs to (null when it's something rarer). */
export function canonicalSpecialty(title?: string | null): string | null {
  if (!title) return null;
  const t = norm(title);
  for (const s of SPECIALTIES) {
    if (norm(s.name) === t) return s.name;
  }
  for (const s of SPECIALTIES) {
    if (s.words.some((w) => t.includes(w.length <= 3 ? ` ${w} ` : ` ${w}`) || t.includes(norm(w)))) return s.name;
  }
  return null;
}

/** What a search box query means: specialties it names or describes (by title or by symptom). */
export function specialtiesForQuery(query: string): string[] {
  const q = norm(query);
  if (q.trim().length < 2) return [];
  const hits = SPECIALTIES.filter((s) =>
    norm(s.name).includes(q) || q.includes(norm(s.name)) ||
    s.words.some((w) => w.length > 3 && (norm(w).includes(q) || q.includes(norm(w)))) ||
    s.symptoms.some((w) => norm(w).includes(q) || q.includes(norm(w))),
  );
  return hits.map((s) => s.name);
}

export const specialtyHint = (name: string) => SPECIALTIES.find((s) => s.name === name)?.hint || '';
