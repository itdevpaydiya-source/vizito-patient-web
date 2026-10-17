import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Stethoscope, FlaskConical, Building2, Sparkles, ArrowRight } from 'lucide-react';
import { SERVICE_TILES, serviceRoute } from '../../../config/serviceTypes';
import { fetchLabTestsApi, type LabTestDef } from '../../../services/labHelper';
import { getProvidersApi } from '../../../services/patientHelper';
type ProviderItem = Awaited<ReturnType<typeof getProvidersApi>>[number];

// Dashboard search with live suggestions, grouped the way patients think: services, lab tests
// (with what each one checks), and doctors / hospitals by name. Keyboard: ↑ ↓ Enter Esc.
interface Item { key: string; group: string; label: string; sub?: string; href: string; icon: React.ComponentType<{ className?: string }> }

export default function DashboardSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [tests, setTests] = useState<LabTestDef[]>([]);
  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchLabTestsApi().then(setTests).catch(() => setTests([])); }, []);
  useEffect(() => {
    const s = q.trim();
    if (s.length < 3) { setProviders([]); return; }
    setLoadingProviders(true);
    const t = setTimeout(() => getProvidersApi(undefined, s).then((p) => setProviders(p.slice(0, 5))).catch(() => setProviders([])).finally(() => setLoadingProviders(false)), 250);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const items = useMemo<Item[]>(() => {
    const s = q.trim().toLowerCase();
    const svc = SERVICE_TILES.filter((t) => t.available && (!s || `${t.name} ${t.shortDesc}`.toLowerCase().includes(s)))
      .map((t) => ({ key: `s-${t.id}`, group: 'Services', label: t.name, sub: t.shortDesc, href: serviceRoute(t.id), icon: Sparkles }));
    if (!s) return svc;
    const lab = tests.filter((t) => `${t.name} ${t.short_name || ''} ${t.code}`.toLowerCase().includes(s)).slice(0, 4)
      .map((t) => ({ key: `t-${t.code}`, group: 'Lab tests', label: t.name, sub: t.about || `${t.specimen_type}${t.fasting_hours ? ` · ${t.fasting_hours} h fasting` : ''}`, href: `/lab-tests?test=${encodeURIComponent(t.code)}`, icon: FlaskConical }));
    const prov = providers.map((p) => ({
      key: `p-${p.id}`, group: 'Doctors & hospitals', label: p.name,
      sub: [p.specialtyOrType, p.qualification, p.city].filter(Boolean).join(' · ') || undefined,
      href: `/healthcare-services?q=${encodeURIComponent(p.name)}`, icon: /hospital|clinic/i.test(String(p.specialtyOrType || '')) ? Building2 : Stethoscope,
    }));
    return [...svc.slice(0, 3), ...lab, ...prov];
  }, [q, tests, providers]);

  const go = (href: string) => { setOpen(false); navigate(href); };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (open && items[active]) return go(items[active].href);
    if (q.trim()) go(`/healthcare-services?q=${encodeURIComponent(q.trim())}`);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(items.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Escape') setOpen(false);
  };
  const groups = Array.from(new Set(items.map((i) => i.group)));

  return (
    <div ref={box} className="mt-6 relative max-w-3xl">
      <form onSubmit={submit} role="search">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text" value={q} aria-label="Search Vizito" aria-autocomplete="list" aria-expanded={open} aria-controls="dash-suggest"
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }} onFocus={() => setOpen(true)} onKeyDown={onKey}
          placeholder="Search doctors, hospitals, lab tests (e.g. CBC, thyroid), pharmacy…"
          className="w-full pl-12 pr-28 py-3.5 bg-white text-slate-900 rounded-2xl font-semibold text-sm placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-teal-400/30 shadow-lg"
        />
        <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors">Search</button>
      </form>
      {open && (
        <div id="dash-suggest" role="listbox" aria-label="Suggestions" className="absolute z-30 left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden text-slate-900 max-h-[420px] overflow-y-auto">
          {!q.trim() && <p className="px-4 pt-3 pb-1 text-[11px] font-bold text-slate-500">What do you need today?</p>}
          {groups.map((g) => (
            <div key={g}>
              <p className="px-4 pt-3 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400">{g}</p>
              {items.filter((i) => i.group === g).map((i) => {
                const idx = items.indexOf(i);
                return (
                  <button key={i.key} type="button" role="option" aria-selected={idx === active} onMouseEnter={() => setActive(idx)} onClick={() => go(i.href)}
                    className={`w-full text-left px-4 py-2 flex items-start gap-3 ${idx === active ? 'bg-teal-50' : ''}`}>
                    <i.icon className="w-4 h-4 mt-0.5 text-teal-700 shrink-0" />
                    <span className="min-w-0 flex-1"><span className="block text-sm font-bold truncate">{i.label}</span>{i.sub && <span className="block text-[11px] text-slate-500 truncate">{i.sub}</span>}</span>
                    <ArrowRight className="w-4 h-4 text-slate-300 mt-0.5" />
                  </button>
                );
              })}
            </div>
          ))}
          {q.trim().length >= 3 && loadingProviders && <p className="px-4 py-2 text-[11px] text-slate-400">Finding doctors and hospitals…</p>}
          {q.trim() && !items.length && !loadingProviders && <p className="px-4 py-3 text-sm text-slate-500">No match for “{q}”. Press Search to look across all services.</p>}
          {q.trim() && <button type="button" onClick={() => go(`/healthcare-services?q=${encodeURIComponent(q.trim())}`)} className="w-full text-left px-4 py-2.5 border-t border-slate-100 text-xs font-bold text-teal-700">See all results for “{q.trim()}”</button>}
        </div>
      )}
    </div>
  );
}
