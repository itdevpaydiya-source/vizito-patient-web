import React from 'react';
import { Package, AlertTriangle, Plus } from 'lucide-react';
import { MOCK_INVENTORY } from '../../../mocks/pharmacyFlowMocks';

const InventoryScreen = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Inventory & Stock</h2>
          <p className="text-slate-500 mt-1">Manage medicine stock and reorder alerts.</p>
        </div>
        <button className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-all active:scale-95">
          <Plus className="w-5 h-5" />
          Add Item
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4">Item Name</th>
                <th className="p-4">Category</th>
                <th className="p-4">Stock</th>
                <th className="p-4">Price</th>
                <th className="p-4">Expiry</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_INVENTORY.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{item.name}</p>
                        <p className="text-xs text-slate-500 font-medium">#{item.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm font-semibold text-slate-600">{item.category}</td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className={`font-black ${item.stock <= item.threshold ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {item.stock} Units
                      </span>
                      {item.stock <= item.threshold && (
                        <span className="text-[10px] font-bold text-rose-500 flex items-center gap-1 mt-0.5">
                          <AlertTriangle className="w-3 h-3" /> Low Stock
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-sm font-bold text-slate-700">₹{item.price}</td>
                  <td className="p-4 text-sm font-medium text-slate-500">{item.expiry}</td>
                  <td className="p-4">
                    <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-colors">
                      {item.stock <= item.threshold ? 'Re-order' : 'Edit'}
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

export default InventoryScreen;
