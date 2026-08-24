import { ENDPOINTS } from "./endpoints";
import apiClient from "./index";
import { getPatientProfileApi } from "./patientHelper";

// Normalized family member for the UI. Every field maps to a real backend column on the linked
// User row (via UserFamilyAssociation.family_member). Nothing is fabricated — fields the backend
// does not store (e.g. blood group) simply do not exist here.
export interface PatientFamilyMember {
  associationId: string;      // UserFamilyAssociation.id — used for delete/update
  memberUserId: number;       // linked users.id
  name: string;
  relationship: string;
  gender: string | null;
  dateOfBirth: string | null;
  age: number | null;         // derived from dateOfBirth; null when unknown
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;   // User.profile_picture, if the patient uploaded one
}

// Backend enum FamilyRelationship (user-family-association.entity.ts). The UI must send one of these.
export const FAMILY_RELATIONSHIPS = ['Father', 'Mother', 'Spouse', 'Child', 'Sibling', 'Other'] as const;
export type FamilyRelationship = (typeof FAMILY_RELATIONSHIPS)[number];

export interface AddFamilyMemberInput {
  first_name: string;
  last_name?: string;
  full_name?: string;
  relationship: FamilyRelationship;
  gender?: string;
  date_of_birth?: string;   // YYYY-MM-DD
  email?: string;
  phone?: string;
}

function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  const age = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  return age >= 0 && age < 150 ? age : null;
}

function mapAssociation(assoc: any): PatientFamilyMember {
  const u = assoc?.family_member || {};
  const name =
    u.full_name ||
    [u.first_name, u.last_name].filter(Boolean).join(' ').trim() ||
    'Family member';
  const dob = u.date_of_birth ? String(u.date_of_birth).split('T')[0] : null;
  return {
    associationId: String(assoc.id),
    memberUserId: Number(u.id),
    name,
    relationship: assoc.relationship || 'Other',
    gender: u.gender ?? null,
    dateOfBirth: dob,
    age: ageFromDob(dob),
    email: u.email ?? null,
    phone: u.phone ?? null,
    avatarUrl: u.profile_picture ?? null,
  };
}

// Resolves the authenticated user's numeric users.id from the JWT-backed profile. Required because
// the family endpoints are path-scoped (/users/:userId/...) and the backend asserts it equals the JWT.
export const getMyUserId = async (): Promise<number | null> => {
  const profile = await getPatientProfileApi();
  return profile ? profile.userId : null;
};

export const getFamilyMembersApi = async (userId: number): Promise<PatientFamilyMember[]> => {
  const res = await apiClient.get(ENDPOINTS.FAMILY.base(userId));
  const list = res?.data;
  if (!Array.isArray(list)) return [];
  return list.map(mapAssociation);
};

export const addFamilyMemberApi = async (
  userId: number,
  input: AddFamilyMemberInput,
): Promise<PatientFamilyMember> => {
  const res = await apiClient.post(ENDPOINTS.FAMILY.base(userId), input);
  // Backend returns the saved association without the loaded relation; re-map defensively.
  const d = res?.data;
  if (d && d.family_member) return mapAssociation(d);
  // Fallback: caller should re-fetch the list. Return a minimal shape from input.
  return {
    associationId: String(d?.id ?? ''),
    memberUserId: Number(d?.family_member_id ?? 0),
    name: input.full_name || [input.first_name, input.last_name].filter(Boolean).join(' ').trim(),
    relationship: input.relationship,
    gender: input.gender ?? null,
    dateOfBirth: input.date_of_birth ?? null,
    age: ageFromDob(input.date_of_birth ?? null),
    email: input.email ?? null,
    phone: input.phone ?? null,
    avatarUrl: null,
  };
};

export const removeFamilyMemberApi = async (userId: number, associationId: string): Promise<void> => {
  await apiClient.delete(ENDPOINTS.FAMILY.association(userId, associationId));
};
