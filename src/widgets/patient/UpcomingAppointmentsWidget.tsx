import React from 'react';
import { MapPin, Video, MoreVertical } from 'lucide-react';
import { MOCK_PATIENT_APPOINTMENTS } from '../../mocks/patientFlowMocks';
import { useNavigate } from 'react-router-dom';

const UpcomingAppointmentsWidget = () => {
  const navigate = useNavigate();
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-800">Upcoming Appointments</h3>
        <button onClick={() => navigate('/my-consultations')} className="text-sm font-semibold text-teal-600 hover:text-teal-700">View All</button>
      </div>

      <div className="space-y-4">
        {MOCK_PATIENT_APPOINTMENTS.map((apt) => (
          <div key={apt.id} className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
            {/* Date/Time Block */}
            <div className="flex flex-col items-center justify-center p-3 bg-white rounded-lg border border-slate-200 shadow-sm min-w-[80px]">
              <span className="text-xs font-bold text-slate-400 uppercase">{apt.date === 'Today' ? 'Today' : apt.date.split(',')[0]}</span>
              <span className="text-lg font-black text-teal-600">{apt.time.split(' ')[0]}</span>
              <span className="text-[10px] font-bold text-slate-500">{apt.time.split(' ')[1]}</span>
            </div>

            {/* Details Block */}
            <div className="flex-1 flex flex-col justify-center">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-slate-800">{apt.doctorName}</h4>
                  <p className="text-sm text-slate-500 font-medium">{apt.specialty}</p>
                </div>
                <button className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/50">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  {apt.type === 'Online' ? <Video className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                  {apt.type === 'Online' ? 'Video Consult' : apt.clinicName}
                </div>
                <div className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider">
                  {apt.status}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UpcomingAppointmentsWidget;
