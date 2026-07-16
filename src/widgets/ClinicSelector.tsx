import React, { useState } from 'react';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { MOCK_CLINICS } from '../mocks/doctorFlowMocks';

interface ClinicSelectorProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

const ClinicSelector: React.FC<ClinicSelectorProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Validation Rule: If only one clinic is associated, selector is disabled.
  const isDisabled = MOCK_CLINICS.length <= 1;

  const selectedName = value 
    ? MOCK_CLINICS.find(c => c.id === value)?.name 
    : 'All Clinics';

  return (
    <div className="relative">
      <button 
        disabled={isDisabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 bg-white border border-slate-200/60 shadow-sm transition-all rounded-xl px-4 py-2.5 ${
          isDisabled 
            ? 'opacity-70 cursor-not-allowed bg-slate-50' 
            : 'hover:border-teal-300 hover:ring-2 hover:ring-teal-100'
        }`}
      >
        <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
          <Building2 className="w-4 h-4 text-teal-600" />
        </div>
        <div className="text-left">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">Clinic</span>
          <span className="block text-sm font-bold text-slate-700 leading-none">{selectedName}</span>
        </div>
        {!isDisabled && (
          <ChevronDown className={`w-4 h-4 text-slate-400 ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {isOpen && !isDisabled && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-64 bg-white border border-slate-200 shadow-xl shadow-slate-200/50 rounded-xl p-2 z-40 animate-in fade-in slide-in-from-top-2 duration-200">
            <button
              onClick={() => { onChange(null); setIsOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                value === null ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              All Clinics
              {value === null && <Check className="w-4 h-4 text-teal-600" />}
            </button>
            
            <div className="h-px bg-slate-100 my-1" />
            
            {MOCK_CLINICS.map(clinic => (
              <button
                key={clinic.id}
                onClick={() => { onChange(clinic.id); setIsOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  value === clinic.id ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex flex-col items-start">
                  <span>{clinic.name}</span>
                  <span className="text-[10px] text-slate-400 font-normal">{clinic.type}</span>
                </div>
                {value === clinic.id && <Check className="w-4 h-4 text-teal-600" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ClinicSelector;
