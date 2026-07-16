import React from 'react';
import { TestTubes, Plus, Settings2 } from 'lucide-react';
import { MOCK_LAB_TESTS } from '../../../mocks/diagnosticFlowMocks';

const LabTestsScreen = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Test Catalog</h2>
          <p className="text-slate-500 mt-1">Manage offered tests, pricing, and turnaround times.</p>
        </div>
        <button className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-all active:scale-95">
          <Plus className="w-5 h-5" />
          Add New Test
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4">Test Name</th>
                <th className="p-4">Category</th>
                <th className="p-4">Price</th>
                <th className="p-4">Turnaround Time (TAT)</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_LAB_TESTS.map(test => (
                <tr key={test.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                        <TestTubes className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{test.name}</p>
                        <p className="text-xs text-slate-500 font-medium">#{test.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm font-semibold text-slate-600">{test.category}</td>
                  <td className="p-4 text-sm font-bold text-slate-700">₹{test.price}</td>
                  <td className="p-4 text-sm font-medium text-slate-500">{test.tat}</td>
                  <td className="p-4 text-center">
                    {test.popular && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700">
                        Popular
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <button className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                      <Settings2 className="w-5 h-5" />
                    </button>
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

export default LabTestsScreen;
