import React from 'react';
import { CalendarPlus, Pill, Ambulance, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PatientQuickActions = () => {
  const navigate = useNavigate();

  const actions = [
    { label: 'Book Consult', icon: CalendarPlus, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100', route: '/find-doctors' },
    { label: 'Order Medicines', icon: Pill, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', route: '/pharmacy-orders' },
    { label: 'Book Lab Test', icon: Activity, color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-100', route: '/my-records' },
    { label: 'Call Ambulance', icon: Ambulance, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', action: () => alert('Calling ambulance...') },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {actions.map((action, idx) => {
        const Icon = action.icon;
        return (
          <button 
            key={idx}
            onClick={() => action.route ? navigate(action.route) : action.action?.()}
            className={`flex flex-col items-center justify-center p-4 rounded-2xl border ${action.border} ${action.bg} hover:shadow-md transition-all active:scale-95`}
          >
            <div className={`p-3 rounded-full bg-white shadow-sm mb-3 ${action.color}`}>
              <Icon className="w-6 h-6" />
            </div>
            <span className={`text-sm font-semibold ${action.color} text-center`}>{action.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default PatientQuickActions;
