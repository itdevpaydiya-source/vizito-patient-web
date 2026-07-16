import React from 'react';
import { FileCheck, UploadCloud, Download } from 'lucide-react';
import { MOCK_LAB_REPORTS } from '../../../mocks/diagnosticFlowMocks';

const LabReportsScreen = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Reports & Results</h2>
          <p className="text-slate-500 mt-1">Upload verified lab results for patient access.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4">Report ID</th>
                <th className="p-4">Patient Name</th>
                <th className="p-4">Test Conducted</th>
                <th className="p-4">Date</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_LAB_REPORTS.map(rep => (
                <tr key={rep.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-4 text-sm font-bold text-slate-500">#{rep.id}</td>
                  <td className="p-4">
                    <p className="font-bold text-slate-800">{rep.patientName}</p>
                  </td>
                  <td className="p-4 text-sm font-semibold text-slate-600">{rep.testName}</td>
                  <td className="p-4 text-sm font-medium text-slate-500">{rep.date}</td>
                  <td className="p-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${rep.status === 'Pending Analysis' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {rep.status}
                    </span>
                  </td>
                  <td className="p-4">
                    {rep.status === 'Pending Analysis' ? (
                      <button className="flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors">
                        <UploadCloud className="w-4 h-4" /> Upload PDF
                      </button>
                    ) : (
                      <button className="flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors">
                        <Download className="w-4 h-4" /> View PDF
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LabReportsScreen;
