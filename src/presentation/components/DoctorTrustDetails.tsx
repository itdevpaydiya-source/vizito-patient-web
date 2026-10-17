import React from 'react';
import { ShieldCheck, Award, Briefcase, FileCheck2 } from 'lucide-react';

export interface DoctorTrustData {
  degrees?: string | null; // e.g. MBBS, MD, MS
  qualification?: string | null; // alias for degrees
  speciality?: string | null; // e.g. Cardiologist, General Physician
  specialization?: string | null; // alias for speciality
  yearsOfExperience?: number | string | null; // e.g. 12
  experienceYears?: number | string | null; // alias
  experience_years?: number | string | null; // alias
  registrationNumber?: string | null; // e.g. 12345
  medicalRegistrationNumber?: string | null; // alias
  medical_registration_number?: string | null; // alias
  council?: string | null; // e.g. Telangana State Medical Council
  medicalCouncilName?: string | null; // alias
  medical_council_name?: string | null; // alias
  verified?: boolean | null; // verified badge
  registrationVerified?: boolean | null; // alias
  registration_verified?: boolean | null; // alias
}

const clean = (val?: string | number | null): string | null => {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (!s || /^null$/i.test(s) || /^undefined$/i.test(s) || s === '—' || s === '-') return null;
  return s;
};

const parseYears = (val?: number | string | null): number | null => {
  if (val === null || val === undefined) return null;
  const num = typeof val === 'number' ? val : parseInt(String(val).replace(/\D/g, ''), 10);
  return !isNaN(num) && num > 0 ? num : null;
};

export const resolveDoctorTrust = (data: DoctorTrustData) => {
  const degrees = clean(data.degrees || data.qualification);
  const speciality = clean(data.speciality || data.specialization);
  const years = parseYears(data.yearsOfExperience ?? data.experienceYears ?? data.experience_years);
  const regNo = clean(data.registrationNumber || data.medicalRegistrationNumber || data.medical_registration_number);
  const council = clean(data.council || data.medicalCouncilName || data.medical_council_name);
  const isVerified = Boolean(data.verified || data.registrationVerified || data.registration_verified);

  let regText: string | null = null;
  if (regNo && council) {
    regText = `Reg. ${regNo} · ${council}`;
  } else if (regNo) {
    regText = `Reg. ${regNo}`;
  } else if (council) {
    regText = council;
  }

  return { degrees, speciality, years, regNo, council, regText, isVerified };
};

/** Plain-text line formatted for print layouts, receipts, or metadata */
export const formatDoctorTrustText = (data: DoctorTrustData): string => {
  const { degrees, speciality, years, regText, isVerified } = resolveDoctorTrust(data);
  const parts: string[] = [];
  if (degrees) parts.push(degrees);
  if (speciality) parts.push(speciality);
  if (years != null) parts.push(`${years} yrs experience`);
  if (regText) parts.push(regText);
  if (isVerified) parts.push('Verified');
  return parts.join(' · ');
};

interface Props extends DoctorTrustData {
  compact?: boolean;
  className?: string;
  showBadge?: boolean;
}

export default function DoctorTrustDetails({
  compact = false,
  className = '',
  showBadge = true,
  ...props
}: Props) {
  const { degrees, speciality, years, regText, isVerified } = resolveDoctorTrust(props);

  const hasAnyField = degrees || speciality || years != null || regText || (showBadge && isVerified);
  if (!hasAnyField) return null;

  if (compact) {
    return (
      <div className={`text-xs text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-1 ${className}`}>
        {showBadge && isVerified && (
          <span className="inline-flex items-center gap-0.5 text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded text-[11px] border border-emerald-200/60">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Verified
          </span>
        )}
        {degrees && <span className="font-semibold text-slate-700">{degrees}</span>}
        {speciality && <span>{speciality}</span>}
        {years != null && <span>{years} yrs experience</span>}
        {regText && <span className="text-slate-500 font-medium">{regText}</span>}
      </div>
    );
  }

  return (
    <div className={`space-y-1 text-xs text-slate-600 ${className}`}>
      {/* Verified Badge & Degrees / Speciality */}
      <div className="flex flex-wrap items-center gap-1.5">
        {showBadge && isVerified && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Verified Doctor
          </span>
        )}
        {(degrees || speciality) && (
          <span className="font-semibold text-slate-800">
            {[degrees, speciality].filter(Boolean).join(' · ')}
          </span>
        )}
      </div>

      {/* Experience & Registration */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
        {years != null && (
          <span className="inline-flex items-center gap-1 font-medium text-slate-700">
            <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
            {years} {years === 1 ? 'year' : 'years'} experience
          </span>
        )}
        {regText && (
          <span className="inline-flex items-center gap-1 font-medium text-slate-600">
            <FileCheck2 className="w-3 h-3 text-teal-600 shrink-0" />
            {regText}
          </span>
        )}
      </div>
    </div>
  );
}
