import React from 'react';
import { Microscope, FileCheck, TestTubes, Wallet, ChevronRight, CheckCircle2 } from 'lucide-react';
import { MOCK_LAB_TESTS, MOCK_LAB_APPOINTMENTS, MOCK_LAB_REPORTS } from './../../mocks/diagnosticFlowMocks';
import { useNavigate } from 'react-router-dom';

const DiagnosticDashboardEngine = () => {
  const navigate = useNavigate();

  const pendingReports = MOCK_LAB_REPORTS.filter(r => r.status === 'Pending Analysis');
  const upcomingApts = MOCK_LAB_APPOINTMENTS.filter(a => a.status === 'Scheduled' || a.status === 'Assigned');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Lab Portal</h2>
        <p className="text-slate-500 mt-1">Manage tests, home collections, and reports.</p>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-slate-500">Today's Appointments</p>
              <h3 className="text-3xl font-black text-indigo-600 mt-2">{upcomingApts.length}</h3>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
              <Microscope className="w-6 h-6" />
            </div>
          </div>
          <button onClick={() => navigate('/lab-appointments')} className="mt-4 text-xs font-bold text-indigo-600 flex items-center hover:underline">View Queue <ChevronRight className="w-3 h-3 ml-1" /></button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-slate-500">Pending Reports</p>
              <h3 className="text-3xl font-black text-amber-600 mt-2">{pendingReports.length}</h3>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
              <FileCheck className="w-6 h-6" />
            </div>
          </div>
          <button onClick={() => navigate('/lab-reports')} className="mt-4 text-xs font-bold text-amber-600 flex items-center hover:underline">Upload Reports <ChevronRight className="w-3 h-3 ml-1" /></button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-slate-500">Active Tests</p>
              <h3 className="text-3xl font-black text-slate-800 mt-2">{MOCK_LAB_TESTS.length}</h3>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 text-slate-600">
              <TestTubes className="w-6 h-6" />
            </div>
          </div>
          <button onClick={() => navigate('/lab-tests')} className="mt-4 text-xs font-bold text-slate-600 flex items-center hover:underline">Manage Catalog <ChevronRight className="w-3 h-3 ml-1" /></button>
        </div>
        
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-slate-500">Revenue (Today)</p>
              <h3 className="text-3xl font-black text-emerald-600 mt-2">₹18,500</h3>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
              <Wallet className="w-6 h-6" />
            </div>
          </div>
          <button onClick={() => navigate('/revenue')} className="mt-4 text-xs font-bold text-emerald-600 flex items-center hover:underline">View Ledger <ChevronRight className="w-3 h-3 ml-1" /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lab Appointments Widget */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-800">Upcoming Appointments</h3>
            <button onClick={() => navigate('/lab-appointments')} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">View All</button>
          </div>
          <div className="space-y-3">
            {MOCK_LAB_APPOINTMENTS.slice(0, 3).map(apt => (
              <div key={apt.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{apt.patientName}</h4>
                  <p className="text-xs text-slate-500 font-medium">{apt.testName}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${apt.type === 'Home Collection' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {apt.type}
                  </span>
                  <p className="text-[10px] font-bold text-slate-500 mt-1">{apt.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Reports Widget */}
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
          <div className="flex items-center justify-between mb-4 border-b border-amber-100 pb-4">
            <h3 className="text-lg font-bold text-slate-800">Pending Analysis</h3>
            <button onClick={() => navigate('/lab-reports')} className="text-sm font-semibold text-amber-600 hover:text-amber-700">Upload Results</button>
          </div>
          <div className="space-y-3">
            {pendingReports.map(rep => (
              <div key={rep.id} className="p-4 rounded-xl bg-white border border-amber-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{rep.patientName}</h4>
                    <p className="text-xs text-slate-500 font-medium">{rep.testName}</p>
                  </div>
                </div>
                <button className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Resolve
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticDashboardEngine;
