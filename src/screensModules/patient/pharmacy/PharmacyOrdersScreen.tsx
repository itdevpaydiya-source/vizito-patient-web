import React, { useState, useEffect } from 'react';
import { 
  Pill, UploadCloud, Truck, ChevronRight, Search, 
  X, CheckCircle2, ShieldCheck, MapPin, Calendar, 
  Clock, FileUp, Info
} from 'lucide-react';
import { MOCK_PHARMACY_ORDERS } from '../../../mocks/patientFlowMocks';

const PharmacyOrdersScreen = () => {
  // Local States
  const [orders, setOrders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // All, Processing, Delivered

  // Modal States
  const [trackOrder, setTrackOrder] = useState<any>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Upload Form States
  const [selectedPharmacy, setSelectedPharmacy] = useState('Apollo Pharmacy');
  const [notes, setNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Load from local storage or mock data
  useEffect(() => {
    try {
      const stored = localStorage.getItem('vizito_patient_orders');
      setOrders(stored ? JSON.parse(stored) : MOCK_PHARMACY_ORDERS);
    } catch (e) {
      console.error(e);
      setOrders(MOCK_PHARMACY_ORDERS);
    }
  }, []);

  // Filter Logic
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.pharmacyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.items.some((item: string) => item.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = 
      statusFilter === 'All' || 
      order.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += 25;
      setUploadProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        
        const newOrder = {
          id: `ord_${Date.now().toString().slice(-4)}`,
          date: 'Today',
          status: 'Processing',
          pharmacyName: selectedPharmacy,
          totalCost: 890,
          items: ['Prescribed Medicines', notes || 'As per attached prescription']
        };

        const updated = [newOrder, ...orders];
        setOrders(updated);
        localStorage.setItem('vizito_patient_orders', JSON.stringify(updated));

        // Reset
        setIsUploading(false);
        setUploadProgress(0);
        setSelectedPharmacy('Apollo Pharmacy');
        setNotes('');
        setIsUploadOpen(false);
      }
    }, 200);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'processing':
        return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'cancelled':
        return 'bg-rose-50 text-rose-700 border-rose-100';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Pharmacy Orders</h2>
          <p className="text-slate-500 mt-1">Order medicines directly, upload doctor prescriptions, and track deliveries.</p>
        </div>
        
        <button 
          onClick={() => setIsUploadOpen(true)}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-xs transition-all active:scale-95 shrink-0"
        >
          <UploadCloud className="w-5 h-5" />
          Upload Prescription
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col md:flex-row gap-4 items-center shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search orders by pharmacy name or medicine..." 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-semibold text-slate-700"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 shrink-0 w-full md:w-auto">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent border-0 text-xs font-bold text-slate-600 focus:ring-0 p-0 focus:outline-none cursor-pointer w-full"
          >
            <option value="All">All Orders</option>
            <option value="Processing">Processing</option>
            <option value="Delivered">Delivered</option>
          </select>
        </div>
      </div>

      {/* Orders Grid */}
      {filteredOrders.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredOrders.map(order => (
            <div key={order.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 hover:border-indigo-300 hover:shadow-xs transition-all group flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform">
                      <Pill className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-800">{order.pharmacyName}</h3>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5">Order ID: #{order.id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 mb-1">{order.date}</p>
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border ${getStatusBadge(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  {order.items.map((item: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-600 font-semibold">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-350 shrink-0"></div>
                      <span className="truncate">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <p className="font-black text-slate-800 text-lg">₹{order.totalCost}</p>
                <button 
                  onClick={() => setTrackOrder(order)}
                  className="flex items-center gap-1 text-indigo-600 text-xs font-bold hover:text-indigo-700 transition-colors"
                >
                  <Truck className="w-4 h-4" />
                  Track Order
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center shadow-xs">
          <Pill className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h3 className="font-bold text-slate-700 text-lg">No Orders Found</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">There are no orders matching your selection.</p>
        </div>
      )}

      {/* Visual Tracking Stepper Modal */}
      {trackOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden relative">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-black text-slate-800 text-base">Track Delivery</h3>
              <button 
                onClick={() => setTrackOrder(null)}
                className="p-1.5 hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Top Card Info */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex justify-between items-center">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm">{trackOrder.pharmacyName}</h4>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">Order ID: #{trackOrder.id}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border ${getStatusBadge(trackOrder.status)}`}>
                  {trackOrder.status}
                </span>
              </div>

              {/* Stepper Timeline */}
              <div className="relative pl-8 space-y-6">
                {/* Connecting Line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-200"></div>

                {/* Step 1 */}
                <div className="relative flex gap-4">
                  <div className="absolute -left-[27px] w-5 h-5 rounded-full bg-indigo-600 border-4 border-white shadow-sm flex items-center justify-center"></div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">Order Placed</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">Order received by pharmacy center • {trackOrder.date === 'Today' ? 'Today' : 'Jun 24'} at 10:15 AM</p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="relative flex gap-4">
                  <div className="absolute -left-[27px] w-5 h-5 rounded-full bg-indigo-600 border-4 border-white shadow-sm flex items-center justify-center"></div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">Pharmacy Confirmed</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">Items verified and packed in temperature boxes • 11:30 AM</p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="relative flex gap-4">
                  <div className={`absolute -left-[27px] w-5 h-5 rounded-full border-4 border-white shadow-sm ${
                    trackOrder.status.toLowerCase() === 'processing' 
                      ? 'bg-indigo-400 animate-pulse' 
                      : 'bg-indigo-600'
                  }`}></div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">Out for Delivery</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">Assigned to delivery courier executive • {trackOrder.status.toLowerCase() === 'processing' ? 'Pending dispatch' : '1:45 PM'}</p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="relative flex gap-4">
                  <div className={`absolute -left-[27px] w-5 h-5 rounded-full border-4 border-white shadow-sm ${
                    trackOrder.status.toLowerCase() === 'delivered' 
                      ? 'bg-indigo-600' 
                      : 'bg-slate-200'
                  }`}></div>
                  <div>
                    <h5 className={`text-xs font-bold ${trackOrder.status.toLowerCase() === 'delivered' ? 'text-slate-800' : 'text-slate-400'}`}>Delivered</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">{trackOrder.status.toLowerCase() === 'delivered' ? 'Handed to recipient • 3:10 PM' : 'Expected delivery by today evening'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setTrackOrder(null)}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-bold rounded-xl"
              >
                Close Tracking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Prescription Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden relative flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-black text-slate-800 text-base">Order Medicines</h3>
              <button 
                onClick={() => setIsUploadOpen(false)}
                className="p-1.5 hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Select Pharmacy Partner</label>
                <select
                  value={selectedPharmacy}
                  onChange={(e) => setSelectedPharmacy(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs font-bold text-slate-700"
                >
                  <option value="Apollo Pharmacy">Apollo Pharmacy (Fastest - 2 hours)</option>
                  <option value="MedPlus">MedPlus (Super Value - 10% discount)</option>
                  <option value="City Care Pharmacy">City Care Pharmacy (Hospital Internal)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Upload Doctor Prescription</label>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-400 transition-all cursor-pointer">
                  <FileUp className="w-8 h-8 text-slate-350 mx-auto mb-2" />
                  <span className="text-xs font-bold text-slate-500 block">Drag & drop files here</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">PDF, PNG, JPG accepted</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Delivery Instructions / Medicine Notes</label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Please deliver after 5:00 PM, substitute with generic equivalent, etc."
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs font-semibold text-slate-700"
                />
              </div>

              {/* Uploading progress bar */}
              {isUploading && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs font-bold text-slate-500">
                    <span>Uploading prescription doc...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all duration-150" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              )}

              {/* Security info */}
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3 text-[10px] text-amber-800 font-bold leading-relaxed text-left">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>Our pharmacist will review the prescription, verify item inventory, and confirm items via a callback/SMS confirmation before dispatching.</span>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Confirm Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PharmacyOrdersScreen;
