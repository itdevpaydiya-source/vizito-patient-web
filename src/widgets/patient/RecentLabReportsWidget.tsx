import React from 'react';
import { FileText, Download, ChevronRight } from 'lucide-react';
import { MOCK_LAB_REPORTS } from '../../mocks/patientFlowMocks';
import { useNavigate } from 'react-router-dom';

const RecentLabReportsWidget = () => {
  const navigate = useNavigate();
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-800">Recent Reports</h3>
        <button onClick={() => navigate('/my-records')} className="text-sm font-semibold text-teal-600 hover:text-teal-700">View All</button>
      </div>

      <div className="divide-y divide-slate-100">
        {MOCK_LAB_REPORTS.map((report) => (
          <div key={report.id} className="py-3 flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 text-sm">{report.testName}</h4>
                <p className="text-xs text-slate-500 mt-0.5">{report.labName} • {report.date}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {report.status === 'Available' ? (
                <button className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              ) : (
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md uppercase tracking-wider">Pending</span>
              )}
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentLabReportsWidget;
