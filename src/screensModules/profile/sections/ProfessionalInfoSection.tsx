import React, { useState } from 'react';
import SectionHeader from '../components/SectionHeader';

const ProfessionalInfoSection = () => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm">
      <SectionHeader 
        title="Professional Information" 
        description="Update your medical credentials and consultation details."
        isEditing={isEditing}
        onEdit={() => setIsEditing(true)}
        onSave={() => setIsEditing(false)}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Medical Registration Number</label>
          <input type="text" disabled={!isEditing} defaultValue="MCI-123456" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-teal-500/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Medical Council Name</label>
          <input type="text" disabled={!isEditing} defaultValue="Medical Council of India" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-teal-500/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Qualification</label>
          <input type="text" disabled={!isEditing} defaultValue="MBBS, MD" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-teal-500/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Specialization</label>
          <input type="text" disabled={!isEditing} defaultValue="Cardiology" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-teal-500/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Super Specialization</label>
          <input type="text" disabled={!isEditing} defaultValue="Interventional Cardiology" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-teal-500/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Years of Experience</label>
          <input type="number" disabled={!isEditing} defaultValue={15} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-teal-500/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Consultation Types</label>
          <div className="flex items-center gap-4 mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" disabled={!isEditing} defaultChecked className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 disabled:opacity-70" />
              <span className="text-sm font-medium text-slate-700">In-Clinic</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" disabled={!isEditing} defaultChecked className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 disabled:opacity-70" />
              <span className="text-sm font-medium text-slate-700">Online</span>
            </label>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Base Consultation Fee (₹)</label>
          <input type="number" disabled={!isEditing} defaultValue={800} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-teal-500/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all" />
        </div>
      </div>
    </div>
  );
};

export default ProfessionalInfoSection;
