import { useState, useEffect, useCallback } from 'react';
import { X, Search, AlertCircle, RotateCcw, Building2, ChevronRight } from 'lucide-react';
import { getProvidersApi } from '../../../services/patientHelper';
import type { ProviderItem } from '../../../services/types';

// Shared pharmacy picker — used both from "Send to Pharmacy" (My Records) and from the
// direct/OTC order path (Order Builder). Reuses the same real GET /patients/providers?
// service=pharmacy search every other discovery surface in this app already calls —
// no new backend endpoint, no fabricated fields (name + type only, same as everywhere
// else this data is shown).
const SelectPharmacyModal: React.FC<{
  title?: string;
  onSelect: (pharmacy: ProviderItem) => void;
  onClose: () => void;
}> = ({ title = 'Select a Pharmacy', onSelect, onClose }) => {
  const [search, setSearch] = useState('');
  const [pharmacies, setPharmacies] = useState<ProviderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (term?: string) => {
    setLoading(true); setError(null);
    try {
      setPharmacies(await getProvidersApi('pharmacy', term || undefined));
    } catch {
      setError('Unable to load pharmacies. Please try again.');
      setPharmacies([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setTimeout(() => load(search), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const initialsOf = (name: string) => name.trim().split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <h3 className="font-black text-slate-800 text-sm">{title}</h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 shrink-0">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pharmacies by name..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>
        </div>

        <div className="overflow-y-auto px-4 pb-4 flex-1">
          {loading ? (
            <div className="py-14 text-center">
              <div className="w-6 h-6 border-[3px] border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-slate-500 font-medium text-xs">Loading pharmacies...</p>
            </div>
          ) : error ? (
            <div className="py-14 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
              <p className="text-rose-600 font-semibold text-xs">{error}</p>
              <button onClick={() => load(search)} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl">
                <RotateCcw className="w-3.5 h-3.5" /> Retry
              </button>
            </div>
          ) : pharmacies.length === 0 ? (
            <div className="py-14 text-center space-y-1">
              <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-slate-500 font-semibold text-xs">No pharmacies found.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pharmacies.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSelect(p)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/30 transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-black text-xs shrink-0">
                    {initialsOf(p.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-800 text-sm truncate">{p.name}</p>
                    {p.subtitle && <p className="text-[11px] text-slate-400 font-medium">{p.subtitle}</p>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SelectPharmacyModal;
