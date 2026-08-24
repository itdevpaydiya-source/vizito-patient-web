import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, CalendarPlus, AlertCircle, RotateCcw, Stethoscope } from 'lucide-react';
import { getProvidersApi } from '../../../services/patientHelper';
import type { ProviderItem } from '../../../services/types';
import { formatDoctorName } from '../../../utils/doctorLabel';

// Find Doctors — real approved doctor-type providers from GET /patients/providers.
// The backend currently exposes only provider identity (name + type); rating, fee, reviews, image and
// availability are NOT provided, so they are omitted rather than fabricated. Booking itself routes into
// the universal booking flow (the online slot/booking chain is pending a backend identity decision).
const BookConsultationScreen = () => {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setProviders(await getProvidersApi('doctor'));
    } catch {
      setLoadError('Unable to load doctors. Please try again.');
      setProviders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = providers.filter((p) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.specialtyOrType || '').toLowerCase().includes(q);
  });

  const initialsOf = (name: string) =>
    name.trim().split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'DR';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Find Doctors & Clinics</h2>
          <p className="text-slate-500 mt-1">Browse verified doctor providers and start a booking.</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by doctor or clinic name..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-sm text-slate-700"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* States */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center shadow-xs">
          <div className="w-7 h-7 border-[3px] border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 font-medium text-sm">Loading doctors...</p>
        </div>
      ) : loadError ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center shadow-xs space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <p className="text-rose-600 font-semibold text-sm">{loadError}</p>
          <button onClick={load} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl">
            <RotateCcw className="w-4 h-4" /> Retry
          </button>
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((doc) => (
            <div key={doc.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col hover:border-teal-400 hover:shadow-md transition-all group">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl border border-slate-100 shadow-xs shrink-0 bg-teal-50 text-teal-700 flex items-center justify-center font-black text-lg">
                  {initialsOf(doc.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-extrabold text-slate-800 group-hover:text-teal-700 transition-colors truncate">{formatDoctorName(doc.name) || doc.name}</h3>
                  {doc.specialtyOrType && <p className="text-xs font-bold text-slate-400 mt-0.5 capitalize">{doc.specialtyOrType}</p>}
                </div>
              </div>

              <button
                onClick={() => navigate('/booking?service=doctor')}
                className="w-full mt-5 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-xs active:scale-98"
              >
                <CalendarPlus className="w-4 h-4" />
                Book Appointment
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center shadow-xs">
          <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 text-lg">No doctors available</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">
            {searchTerm ? 'No doctors match your search.' : 'There are no approved doctor providers yet.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default BookConsultationScreen;
