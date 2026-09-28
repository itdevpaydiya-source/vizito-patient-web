import apiClient from './index';

// The patient's own health profile (gateway -> vizito-auth /patients/me/health-profile). The treating
// doctor sees it as "patient-reported" in the consultation.
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
export const COMMON_CONDITIONS = ['Diabetes', 'High blood pressure', 'Asthma', 'Thyroid disorder', 'Heart disease', 'Kidney disease', 'Pregnancy', 'Epilepsy'];

export interface ReportedAllergy { allergen: string; reaction?: string | null; severity?: string | null }
export interface ReportedMedication { name: string; dose?: string | null }

export interface HealthProfile {
  blood_group: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  bmi: number | null;
  allergies: ReportedAllergy[];
  no_known_allergies: boolean;
  conditions: string[];
  medications: ReportedMedication[];
  emergency_contact: { name: string | null; relation: string | null; phone: string | null } | null;
  updated_at: string | null;
  is_empty: boolean;
}

export interface HealthProfileInput {
  blood_group: string;
  height_cm: number | null;
  weight_kg: number | null;
  allergies: ReportedAllergy[];
  no_known_allergies: boolean;
  conditions: string[];
  medications: ReportedMedication[];
  emergency_contact_name: string;
  emergency_contact_relation: string;
  emergency_contact_phone: string;
}

export const getHealthProfileApi = async (): Promise<HealthProfile> => (await apiClient.get('/patients/me/health-profile')).data;

export const saveHealthProfileApi = async (input: HealthProfileInput): Promise<HealthProfile> => {
  try {
    return (await apiClient.put('/patients/me/health-profile', input)).data;
  } catch (e: any) {
    const m = e?.response?.data?.message;
    throw new Error(Array.isArray(m) ? m[0] : m || 'Could not save your health profile.');
  }
};
