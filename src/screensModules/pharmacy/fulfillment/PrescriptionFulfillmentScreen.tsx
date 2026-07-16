import React from 'react';
import { ClipboardList, CheckCircle2, Clock, Truck } from 'lucide-react';
import { MOCK_PRESCRIPTIONS } from '../../../mocks/pharmacyFlowMocks';

const PrescriptionFulfillmentScreen = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Prescription Fulfillment</h2>
          <p className="text-slate-500 mt-1">Process digital prescriptions and manage deliveries.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_PRESCRIPTIONS.map(rx => (
          <div key={rx.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col group hover:border-indigo-300 transition-colors relative">
            
            <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-600">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{rx.patientName}</h3>
                  <p className="text-xs text-slate-500 font-medium">ID: {rx.id}</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                rx.status === 'Pending' ? 'bg-rose-100 text-rose-700' :
                rx.status === 'Processing' ? 'bg-indigo-100 text-indigo-700' :
                'bg-emerald-100 text-emerald-700'
              }`}>
                {rx.status}
              </span>
            </div>

            <div className="flex-1 space-y-3 mb-6">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Prescribed By:</span>
                <span className="text-slate-800 font-bold">{rx.doctorName}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Received:</span>
                <span className="text-slate-800 font-bold">{rx.date}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Items to Pack:</span>
                <span className="text-slate-800 font-black">{rx.items}</span>
              </div>
            </div>

            <div className="mt-auto grid grid-cols-2 gap-2">
              {rx.status === 'Pending' ? (
                <button className="col-span-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm transition-all active:scale-95 text-sm flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4" /> Start Processing
                </button>
              ) : rx.status === 'Processing' ? (
                <>
                  <button className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm transition-all active:scale-95 text-sm flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Ready
                  </button>
                  <button className="py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-sm transition-all active:scale-95 text-sm flex items-center justify-center gap-2">
                    <Truck className="w-4 h-4" /> Out for Delivery
                  </button>
                </>
              ) : (
                <button className="col-span-2 py-2.5 bg-slate-100 text-slate-400 rounded-xl font-bold text-sm cursor-not-allowed">
                  Completed
                </button>
              )}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};

export default PrescriptionFulfillmentScreen;
