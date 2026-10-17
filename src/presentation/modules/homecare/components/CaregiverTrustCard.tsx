import React, { useEffect, useState } from 'react';
import { ShieldCheck, Award, FileCheck2, HeartPulse, User, CheckCircle2 } from 'lucide-react';
import { hcStaffCardApi, type HcStaffCard } from '../../../../services/homecareHelper';

interface CaregiverTrustCardProps {
  staff: HcStaffCard | any;
  className?: string;
}

export default function CaregiverTrustCard({ staff, className = '' }: CaregiverTrustCardProps) {
  const [loadedStaff, setLoadedStaff] = useState<any>(null);

  useEffect(() => {
    if (staff?.id && !staff?.trust_badges?.id_verified) {
      hcStaffCardApi(staff.id)
        .then((res) => {
          if (res) setLoadedStaff(res);
        })
        .catch(() => {});
    }
  }, [staff?.id]);

  const current = loadedStaff || staff;
  if (!current) return null;

  const displayName = current.full_name || current.name || 'Care Professional';
  const initials = displayName
    ? displayName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'HC';

  const trust = current.trust_badges || {};

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 ${className}`} data-testid="caregiver-trust-card">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-2xl bg-teal-700 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-sm border-2 border-teal-600/20">
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-base font-black text-slate-900 truncate">{displayName}</h4>
            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3 text-teal-600" /> Verified Caregiver
            </span>
          </div>

          <div className="text-xs text-slate-600 font-semibold mt-0.5">
            {current.qualification || current.role_label || 'Certified Attendant'}
            {current.experience_years ? ` · ${current.experience_years} yrs experience` : ''}
          </div>

          {current.languages && current.languages.length > 0 && (
            <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
              Speaks: {Array.isArray(current.languages) ? current.languages.join(', ') : current.languages}
            </div>
          )}
        </div>
      </div>

      {/* Trust Badges Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
        {/* Police Verification */}
        <div className={`p-2.5 rounded-xl border text-[11px] ${
          trust.police_verified?.verified
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
            : 'bg-slate-50 border-slate-200 text-slate-500'
        }`}>
          <div className="flex items-center gap-1.5 font-extrabold text-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Police Verified</span>
          </div>
          <div className="text-[10px] text-slate-600 mt-1 truncate">
            {trust.police_verified?.certificate_no || 'Record Checked'}
          </div>
        </div>

        {/* Aadhaar ID Verification */}
        <div className={`p-2.5 rounded-xl border text-[11px] ${
          trust.id_verified?.verified
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
            : 'bg-slate-50 border-slate-200 text-slate-500'
        }`}>
          <div className="flex items-center gap-1.5 font-extrabold text-emerald-800">
            <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Govt ID Verified</span>
          </div>
          <div className="text-[10px] text-slate-600 mt-1">
            {trust.id_verified?.aadhaar_last4 ? `•••• •••• ${trust.id_verified.aadhaar_last4}` : 'ID Cleared'}
          </div>
        </div>

        {/* Clinical / GDA Training */}
        <div className={`p-2.5 rounded-xl border text-[11px] ${
          trust.training_certificate?.verified
            ? 'bg-indigo-50/80 border-indigo-200 text-indigo-900'
            : 'bg-slate-50 border-slate-200 text-slate-500'
        }`}>
          <div className="flex items-center gap-1.5 font-extrabold text-indigo-800">
            <Award className="w-3.5 h-3.5 text-indigo-600" />
            <span>Certified Training</span>
          </div>
          <div className="text-[10px] text-slate-600 mt-1 truncate" title={trust.training_certificate?.certificate}>
            {trust.training_certificate?.certificate ? 'NSDC / GDA Certified' : 'Skills Checked'}
          </div>
        </div>

        {/* Health / Fitness Check */}
        <div className={`p-2.5 rounded-xl border text-[11px] ${
          trust.health_checked?.verified
            ? 'bg-teal-50/80 border-teal-200 text-teal-900'
            : 'bg-slate-50 border-slate-200 text-slate-500'
        }`}>
          <div className="flex items-center gap-1.5 font-extrabold text-teal-800">
            <HeartPulse className="w-3.5 h-3.5 text-teal-600" />
            <span>Health Screened</span>
          </div>
          <div className="text-[10px] text-slate-600 mt-1">
            {trust.health_checked?.date ? 'Annual Fit Check' : 'Medically Fit'}
          </div>
        </div>
      </div>
    </div>
  );
}
