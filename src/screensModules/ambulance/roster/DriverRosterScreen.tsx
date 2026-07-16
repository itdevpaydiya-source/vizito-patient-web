import React from 'react';
import { Contact, Plus, Phone, Ambulance } from 'lucide-react';
import { MOCK_AMBULANCE_DRIVERS } from '../../../mocks/ambulanceFlowMocks';

const DriverRosterScreen = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Driver & Staff Roster</h2>
          <p className="text-slate-500 mt-1">Manage EMTs, drivers, shifts, and contact info.</p>
        </div>
        <button className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-all active:scale-95">
          <Plus className="w-5 h-5" />
          Add Staff
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_AMBULANCE_DRIVERS.map(driver => (
          <div key={driver.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col group hover:border-indigo-300 transition-colors relative">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-black text-lg">
                  {driver.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{driver.name}</h3>
                  <p className="text-xs font-semibold text-slate-500">{driver.role}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-100 text-sm">
              <div className="flex items-center gap-1 font-bold text-slate-600">
                <Phone className="w-4 h-4" /> {driver.phone}
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ml-auto ${
                driver.status === 'Available' ? 'bg-emerald-100 text-emerald-700' : 
                driver.status === 'On Route' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {driver.status}
              </span>
            </div>

            <div className="flex-1">
              <p className="text-xs font-medium text-slate-500 mb-1">Current Assignment:</p>
              <p className="text-sm font-bold text-slate-800 flex items-center gap-1">
                {driver.assignedVehicle !== 'None' ? (
                  <><Ambulance className="w-4 h-4 text-indigo-500" /> Vehicle {driver.assignedVehicle}</>
                ) : 'None'}
              </p>
            </div>
            
            <button className="mt-4 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-all">
              View Profile
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DriverRosterScreen;
