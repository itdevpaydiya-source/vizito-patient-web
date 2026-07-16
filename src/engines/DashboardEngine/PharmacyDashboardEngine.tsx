import React from 'react';
import { Package, ClipboardList, Wallet, AlertTriangle, ChevronRight } from 'lucide-react';
import { MOCK_INVENTORY, MOCK_PRESCRIPTIONS } from './../../mocks/pharmacyFlowMocks';
import { useNavigate } from 'react-router-dom';

const PharmacyDashboardEngine = () => {
  const navigate = useNavigate();

  const lowStockItems = MOCK_INVENTORY.filter(item => item.stock <= item.threshold);
  const pendingRx = MOCK_PRESCRIPTIONS.filter(rx => rx.status === 'Pending');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Pharmacy Panel</h2>
        <p className="text-slate-500 mt-1">Manage inventory, orders, and prescriptions.</p>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-slate-500">Pending Prescriptions</p>
              <h3 className="text-3xl font-black text-rose-600 mt-2">{pendingRx.length}</h3>
            </div>
            <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
              <ClipboardList className="w-6 h-6" />
            </div>
          </div>
          <button onClick={() => navigate('/pharmacy-prescriptions')} className="mt-4 text-xs font-bold text-rose-600 flex items-center hover:underline">View Queue <ChevronRight className="w-3 h-3 ml-1" /></button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-slate-500">Low Stock Alerts</p>
              <h3 className="text-3xl font-black text-amber-600 mt-2">{lowStockItems.length}</h3>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
              <Package className="w-6 h-6" />
            </div>
          </div>
          <button onClick={() => navigate('/pharmacy-inventory')} className="mt-4 text-xs font-bold text-amber-600 flex items-center hover:underline">Review Inventory <ChevronRight className="w-3 h-3 ml-1" /></button>
        </div>
        
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-slate-500">Today's Revenue</p>
              <h3 className="text-3xl font-black text-teal-600 mt-2">₹12,450</h3>
            </div>
            <div className="p-3 rounded-xl bg-teal-50 text-teal-600">
              <Wallet className="w-6 h-6" />
            </div>
          </div>
          <button onClick={() => navigate('/revenue')} className="mt-4 text-xs font-bold text-teal-600 flex items-center hover:underline">View Transactions <ChevronRight className="w-3 h-3 ml-1" /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prescription Queue Widget */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">Recent Prescriptions</h3>
            <button onClick={() => navigate('/pharmacy-prescriptions')} className="text-sm font-semibold text-teal-600 hover:text-teal-700">View All</button>
          </div>
          <div className="space-y-3">
            {MOCK_PRESCRIPTIONS.slice(0, 3).map(rx => (
              <div key={rx.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{rx.patientName}</h4>
                  <p className="text-xs text-slate-500 font-medium">{rx.doctorName}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${rx.status === 'Pending' ? 'bg-rose-100 text-rose-700' : rx.status === 'Processing' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {rx.status}
                  </span>
                  <p className="text-[10px] font-bold text-slate-500 mt-1">{rx.items} items</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Alerts Widget */}
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Low Stock Items
            </h3>
            <button onClick={() => navigate('/pharmacy-inventory')} className="text-sm font-semibold text-amber-600 hover:text-amber-700">Re-order</button>
          </div>
          <div className="space-y-3">
            {lowStockItems.map(item => (
              <div key={item.id} className="p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{item.name}</h4>
                  <p className="text-xs text-slate-600 font-medium">Category: {item.category}</p>
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className="font-black text-rose-600">{item.stock} left</span>
                  <span className="text-[10px] font-bold text-slate-500 mt-0.5">Threshold: {item.threshold}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PharmacyDashboardEngine;
