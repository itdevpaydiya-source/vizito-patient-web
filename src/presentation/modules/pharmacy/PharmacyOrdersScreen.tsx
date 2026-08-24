import { Pill, Clock } from 'lucide-react';

// Pharmacy Orders — there is currently NO patient-facing pharmacy-order backend in this platform.
// Per the no-fabrication rule, this screen shows an honest "unavailable" state instead of mock orders.
// When a real pharmacy-order service + patient-scoped API exists, this screen will be wired to it.
const PharmacyOrdersScreen = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Pharmacy Orders</h2>
        <p className="text-slate-500 mt-1">Order medicines and track deliveries.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 py-20 text-center shadow-xs space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 mx-auto">
          <Pill className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-slate-700 text-lg">Pharmacy ordering is coming soon</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Online pharmacy orders aren't available yet. This feature will appear here once the pharmacy
            service is connected — no sample orders are shown in the meantime.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
          <Clock className="w-3.5 h-3.5" /> Not yet available
        </div>
      </div>
    </div>
  );
};

export default PharmacyOrdersScreen;
