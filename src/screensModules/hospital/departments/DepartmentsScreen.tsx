import React from 'react';
import { Building2, Users } from 'lucide-react';
import { MOCK_DEPARTMENTS } from '../../../mocks/hospitalFlowMocks';

const DepartmentsScreen = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Departments & Staff</h2>
          <p className="text-slate-500 mt-1">Manage hospital departments and duty rosters.</p>
        </div>
        <button className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold shadow-sm transition-all active:scale-95 text-sm">
          + Add Department
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_DEPARTMENTS.map(dept => (
          <div key={dept.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:border-teal-300 transition-colors">
            <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-4">
              <div className="p-3 rounded-xl bg-teal-50 text-teal-600">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">{dept.name}</h3>
                <p className="text-xs text-slate-500 font-medium">Head: {dept.head}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <Users className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                <p className="text-2xl font-black text-slate-700">{dept.doctors}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Doctors</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <Users className="w-5 h-5 text-teal-400 mx-auto mb-1" />
                <p className="text-2xl font-black text-teal-700">{dept.patientsAdmitted}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Admitted</p>
              </div>
            </div>
            
            <button className="w-full mt-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-semibold transition-colors text-sm">
              View Roster
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DepartmentsScreen;
