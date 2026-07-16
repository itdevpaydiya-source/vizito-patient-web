import { useState } from 'react';
import SectionHeader from '../components/SectionHeader';

const BankDetailsSection = () => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm">
      <SectionHeader 
        title="Bank Details" 
        description="Required for processing your settlements and payouts."
        isEditing={isEditing}
        onEdit={() => setIsEditing(true)}
        onSave={() => setIsEditing(false)}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Account Holder Name</label>
          <input type="text" disabled={!isEditing} defaultValue="Dr. Sarah Jenkins" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-teal-500/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Account Number</label>
          <input type="password" disabled={!isEditing} defaultValue="1234567890" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-teal-500/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Confirm Account Number</label>
          <input type="password" disabled={!isEditing} defaultValue="1234567890" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-teal-500/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">IFSC Code</label>
          <input type="text" disabled={!isEditing} defaultValue="HDFC0001234" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-teal-500/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Bank Name</label>
          <input type="text" disabled={!isEditing} defaultValue="HDFC Bank" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-teal-500/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all" />
        </div>
      </div>
    </div>
  );
};

export default BankDetailsSection;
