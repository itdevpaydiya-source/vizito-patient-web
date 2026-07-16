import React from 'react';
import { Microscope, MapPin, CheckCircle2, Navigation } from 'lucide-react';
import { MOCK_LAB_APPOINTMENTS } from '../../../mocks/diagnosticFlowMocks';

const LabAppointmentsScreen = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Lab Appointments</h2>
          <p className="text-slate-500 mt-1">Manage home sample collections and in-lab visits.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_LAB_APPOINTMENTS.map(apt => (
          <div key={apt.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col group hover:border-indigo-300 transition-colors relative">
            
            <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-600">
                  <Microscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{apt.patientName}</h3>
                  <p className="text-xs text-slate-500 font-medium">ID: {apt.id}</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                apt.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                apt.status === 'Assigned' ? 'bg-indigo-100 text-indigo-700' :
                'bg-emerald-100 text-emerald-700'
              }`}>
                {apt.status}
              </span>
            </div>

            <div className="flex-1 space-y-3 mb-6">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Test Required:</span>
                <span className="text-slate-800 font-bold">{apt.testName}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Time:</span>
                <span className="text-slate-800 font-bold">{apt.time}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Type:</span>
                <span className={`font-black flex items-center gap-1 ${apt.type === 'Home Collection' ? 'text-purple-600' : 'text-blue-600'}`}>
                  {apt.type === 'Home Collection' ? <Navigation className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                  {apt.type}
                </span>
              </div>
            </div>

            <div className="mt-auto">
              {apt.type === 'Home Collection' && apt.status === 'Scheduled' ? (
                <button className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm transition-all active:scale-95 text-sm">
                  Assign Phlebotomist
                </button>
              ) : apt.status === 'Assigned' ? (
                <button className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all active:scale-95 text-sm flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Mark Sample Collected
                </button>
              ) : (
                <button className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm transition-all active:scale-95 text-sm flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Check-In Patient
                </button>
              )}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};

export default LabAppointmentsScreen;
