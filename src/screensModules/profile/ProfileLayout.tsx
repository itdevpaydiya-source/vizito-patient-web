import React, { useState } from 'react';
import PersonalInfoSection from './sections/PersonalInfoSection';
import ProfessionalInfoSection from './sections/ProfessionalInfoSection';
import KYCVerificationSection from './sections/KYCVerificationSection';
import BankDetailsSection from './sections/BankDetailsSection';
import WebsiteRequestSection from './sections/WebsiteRequestSection';
import {
  User, Briefcase, Building2, ShieldCheck, Landmark, Globe,
  CheckCircle2, Clock, AlertCircle, ChevronRight
} from 'lucide-react';
import { MOCK_PROFILE_COMPLETION } from '../../mocks/doctorFlowMocks';

const tabs = [
  { id: 'personal', label: 'Personal Information', icon: User },
  { id: 'professional', label: 'Professional Information', icon: Briefcase },
  { id: 'clinic', label: 'Clinic Management', icon: Building2 },
  { id: 'kyc', label: 'KYC & Verification', icon: ShieldCheck },
  { id: 'bank', label: 'Bank Details', icon: Landmark },
  { id: 'website', label: 'Website Request', icon: Globe },
];

const completionStatus = [
  { label: 'Personal Information', status: 'done' },
  { label: 'Professional Information', status: 'done' },
  { label: 'Clinic Information', status: 'done' },
  { label: 'KYC Verification', status: 'pending' },
  { label: 'Bank Details', status: 'pending' },
  { label: 'Website Request', status: 'not-requested' },
];

const StatusIcon = ({ status }: { status: string }) => {
  if (status === 'done') return <CheckCircle2 className="w-4 h-4 text-teal-600" />;
  if (status === 'pending') return <Clock className="w-3.5 h-3.5 text-amber-500" />;
  return <AlertCircle className="w-3.5 h-3.5 text-slate-400" />;
};

const StatusLabel = ({ status }: { status: string }) => {
  if (status === 'done') return null;
  if (status === 'pending') return <span className="text-[10px] font-semibold text-amber-600">Pending</span>;
  return <span className="text-[10px] font-semibold text-slate-400">Not Requested</span>;
};

const ProfileLayout = () => {
  const [activeTab, setActiveTab] = useState('personal');
  const pct = MOCK_PROFILE_COMPLETION.percentage;

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="space-y-1">
      {/* Page Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-extrabold text-slate-800">My Profile</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your personal and professional information</p>
      </div>

      {/* Tab Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-0 px-2 border-b border-slate-100 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-all ${
                  isActive
                    ? 'border-teal-600 text-teal-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content + Right Sidebar */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-5 w-full">
          {activeTab === 'personal' && <PersonalInfoSection />}
          {activeTab === 'professional' && <ProfessionalInfoSection />}
          {activeTab === 'kyc' && <KYCVerificationSection />}
          {activeTab === 'bank' && <BankDetailsSection />}
          {activeTab === 'website' && <WebsiteRequestSection />}
          {activeTab === 'clinic' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start sm:items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Clinic Management</h3>
                  <p className="text-sm text-slate-500 mt-1">Manage clinics associated with your practice.</p>
                </div>
                <button className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
                  Manage Clinics
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-xl p-4 flex items-start gap-4 hover:border-teal-300 transition-colors cursor-pointer group">
                  <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center shrink-0">
                    <Building2 className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 group-hover:text-teal-600 transition-colors">Banjarahills Clinic</h4>
                    <p className="text-xs text-slate-500 mt-0.5">In-Clinic • ₹800 Fee</p>
                    <p className="text-xs text-slate-400 mt-2">Banjara Hills, Hyderabad</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-full lg:w-72 shrink-0 space-y-4">
          {/* Profile Completion Card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Profile Completion</h3>

            {/* Circle Progress */}
            <div className="flex justify-center mb-4">
              <div className="relative w-28 h-28">
                <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90">
                  <circle cx="50" cy="50" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r={radius} fill="none"
                    stroke="#7C3AED" strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-extrabold text-slate-800">{pct}%</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500 text-center mb-4">
              Complete your profile to enable settlements and verification.
            </p>
            <button className="w-full bg-teal-700 hover:bg-teal-800 text-white text-sm font-bold py-2.5 rounded-xl transition-colors">
              Complete Profile
            </button>
          </div>

          {/* Completion Status */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Completion Status</h3>
            <div className="space-y-2.5">
              {completionStatus.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <StatusIcon status={item.status} />
                    <span className="text-xs font-medium text-slate-700">{item.label}</span>
                  </div>
                  <StatusLabel status={item.status} />
                </div>
              ))}
            </div>
          </div>

          {/* Account Status */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Account Status</h3>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Verification Status</span>
                <span className="text-xs font-bold text-amber-600">Under Review</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Member Since</span>
                <span className="text-xs font-semibold text-slate-700">12 Jan 2024</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Account Type</span>
                <span className="text-xs font-semibold text-slate-700">Doctor</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileLayout;
