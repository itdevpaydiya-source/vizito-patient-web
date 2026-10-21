// What patients can say about each kind of care: quick tags for what went well and what didn't.
// Kept short and specific to healthcare so reviews are useful to the next patient and the provider.
export type CareKind = 'doctor' | 'hospital' | 'lab' | 'pharmacy' | 'homecare' | 'equipment';

export const KIND_LABEL: Record<CareKind, string> = {
  doctor: 'Doctor',
  hospital: 'Hospital',
  lab: 'Lab',
  pharmacy: 'Pharmacy',
  homecare: 'Home care',
  equipment: 'Equipment rental',
};

export const CARE_TAGS: Record<CareKind, { good: string[]; bad: string[] }> = {
  doctor: { good: ['Listened carefully', 'Explained clearly', 'Thorough check-up', 'Clear prescription', 'Started on time'], bad: ['Long wait', 'Felt rushed', 'Unclear instructions'] },
  hospital: { good: ['Listened carefully', 'Explained clearly', 'Clean facility', 'Helpful staff', 'Started on time'], bad: ['Long wait', 'Felt rushed', 'Billing unclear'] },
  lab: { good: ['Painless sample collection', 'Hygienic', 'Report on time', 'Easy-to-read report', 'Helpful staff'], bad: ['Long wait', 'Report delayed', 'Sample taken again'] },
  pharmacy: { good: ['All medicines available', 'Ready on time', 'Explained the dosage', 'Well packed', 'Fair price'], bad: ['Medicine not available', 'Delayed', 'Wrong item'] },
  homecare: { good: ['Punctual', 'Skilled care', 'Kind and respectful', 'Explained the care plan', 'Hygienic'], bad: ['Arrived late', 'Rushed visit', 'Poor communication'] },
  equipment: { good: ['Clean & Sanitized', 'Prompt Delivery', 'Helpful Support', 'Excellent Condition', 'Smooth Return'], bad: ['Late delivery', 'Defective equipment', 'Missing accessories', 'Unclear instructions'] },
};

export const STAR_WORD = ['', 'Very poor', 'Poor', 'Okay', 'Good', 'Excellent'];
