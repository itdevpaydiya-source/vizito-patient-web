import React from 'react';
import { Activity, Heart, Droplet } from 'lucide-react';
import { MOCK_HEALTH_VITALS } from '../../mocks/patientFlowMocks';

const icons: Record<string, React.ElementType> = {
  'Heart Rate': Heart,
  'Blood Pressure': Activity,
  'Sugar (Fasting)': Droplet,
};

const colors: Record<string, string> = {
  'Heart Rate': 'text-rose-600 bg-rose-50 border-rose-100',
  'Blood Pressure': 'text-sky-600 bg-sky-50 border-sky-100',
  'Sugar (Fasting)': 'text-violet-600 bg-violet-50 border-violet-100',
};

const HealthVitalsSummary = () => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-800">Health Vitals</h3>
        <button className="text-xs font-bold text-slate-400 uppercase tracking-wider hover:text-teal-600">Update</button>
      </div>

      <div className="space-y-3">
        {MOCK_HEALTH_VITALS.map((vital, idx) => {
          const Icon = icons[vital.name] || Activity;
          const colorClass = colors[vital.name] || 'text-slate-600 bg-slate-50 border-slate-100';
          
          return (
            <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg border ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="font-semibold text-slate-700 text-sm">{vital.name}</span>
              </div>
              <div className="text-right">
                <span className="font-black text-slate-900">{vital.value}</span>
                <span className="text-xs font-semibold text-slate-500 ml-1">{vital.unit}</span>
              </div>
            </div>
          );
        })}
      </div>
      
      <button className="w-full mt-4 py-2 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 font-semibold text-sm hover:border-teal-300 hover:text-teal-600 hover:bg-teal-50 transition-colors">
        + Add New Reading
      </button>
    </div>
  );
};

export default HealthVitalsSummary;
