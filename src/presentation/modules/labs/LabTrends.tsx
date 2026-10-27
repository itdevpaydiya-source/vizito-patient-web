import { useEffect, useMemo, useState } from 'react';
import LabTrendsEmpty from './LabTrendsEmpty';
import { TrendingUp } from 'lucide-react';
import { labTrendsApi, labError, type TrendParam } from '../../../services/labHelper';

// Trends: one parameter over time across all released reports (any Vizito lab), with the normal
// band shaded. Points outside the range are marked. For the account holder or a family member.
const day = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
const FLAG: Record<string, string> = { L: 'Low', H: 'High', LL: 'Critically low', HH: 'Critically high' };

export default function LabTrends() {
  const [data, setData] = useState<Awaited<ReturnType<typeof labTrendsApi>> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [person, setPerson] = useState('');
  const [key, setKey] = useState('');
  useEffect(() => { labTrendsApi().then((d) => { setData(d); setPerson(d.people[0]?.id || ''); }).catch((e) => setErr(labError(e, 'Could not load your results.'))); }, []);
  const params = useMemo(() => (data?.parameters || []).filter((p) => p.patient_profile_id === person), [data, person]);
  // Open on what needs attention: a result that has been outside its range, else the first one.
  useEffect(() => {
    const first = params.find((x) => x.points.some((pt) => pt.flag && pt.flag !== 'N')) || params[0];
    setKey(first ? `${first.test_code}|${first.code}` : '');
  }, [person, params.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const p = params.find((x) => `${x.test_code}|${x.code}` === key) || null;

  if (err) return <p role="alert" className="text-sm font-semibold text-rose-700">{err}</p>;
  if (!data) return <p className="text-sm text-slate-400">Loading…</p>;
  if (!data.parameters.length) return <LabTrendsEmpty />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {data.people.length > 1 && (
          <label className="text-xs font-bold text-slate-700">Person
            <select aria-label="Person" value={person} onChange={(e) => setPerson(e.target.value)} className="block mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">{data.people.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
          </label>
        )}
        <label className="text-xs font-bold text-slate-700">Result
          <select aria-label="Result" value={key} onChange={(e) => setKey(e.target.value)} className="block mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">
            {params.map((x) => <option key={`${x.test_code}|${x.code}`} value={`${x.test_code}|${x.code}`}>{x.points.some((pt) => pt.flag && pt.flag !== 'N') ? '● ' : ''}{x.name} ({x.test_name}) · {x.points.length}</option>)}
          </select>
        </label>
      </div>
      {p && <TrendCard p={p} />}
    </div>
  );
}

export function TrendCard({ p }: { p: TrendParam }) {
  const W = 560, Hh = 200, pad = { l: 44, r: 16, t: 14, b: 30 };
  const vals = p.points.map((x) => x.value);
  const last = p.points[p.points.length - 1];
  const lo = last.low, hi = last.high;
  const minV = Math.min(...vals, lo ?? Infinity), maxV = Math.max(...vals, hi ?? -Infinity);
  const span = maxV - minV || Math.abs(maxV) || 1;
  const yMin = minV - span * 0.15, yMax = maxV + span * 0.15;
  const x = (i: number) => pad.l + (p.points.length === 1 ? (W - pad.l - pad.r) / 2 : (i * (W - pad.l - pad.r)) / (p.points.length - 1));
  const y = (v: number) => pad.t + (1 - (v - yMin) / (yMax - yMin)) * (Hh - pad.t - pad.b);
  const ticks = [yMin + (yMax - yMin) * 0.1, (yMin + yMax) / 2, yMax - (yMax - yMin) * 0.1];
  const prev = p.points.length > 1 ? p.points[p.points.length - 2].value : null;
  const change = prev !== null ? last.value - prev : null;
  return (
    <section aria-label={`Trend of ${p.name}`} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-teal-700" /> {p.name} <span className="text-xs font-semibold text-slate-500">{p.unit}</span></h2>
        <p className="text-sm"><span className="font-black tabular-nums">{last.value}</span> {p.unit} latest{change !== null && <span className={`ml-2 text-xs font-bold ${change === 0 ? 'text-slate-500' : 'text-slate-700'}`}>{change > 0 ? '▲' : change < 0 ? '▼' : '='} {Math.abs(Math.round(change * 100) / 100)} since last test</span>}</p>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${Hh}`} className="w-full" role="img" aria-label={`${p.name} over time: ${p.points.map((pt) => `${day(pt.date)} ${pt.value}`).join(', ')}`}>
          {lo !== null && hi !== null && <rect x={pad.l} y={y(hi)} width={W - pad.l - pad.r} height={Math.max(1, y(lo) - y(hi))} fill="#14b8a6" opacity="0.12" />}
          {ticks.map((t) => <g key={t}><line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#e2e8f0" /><text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#64748b">{Math.round(t * 10) / 10}</text></g>)}
          <polyline fill="none" stroke="#0f766e" strokeWidth="2" points={p.points.map((pt, i) => `${x(i)},${y(pt.value)}`).join(' ')} />
          {p.points.map((pt, i) => {
            const bad = pt.flag && pt.flag !== 'N';
            return <g key={i}><circle cx={x(i)} cy={y(pt.value)} r="5" fill={bad ? (pt.flag === 'LL' || pt.flag === 'HH' ? '#e11d48' : '#d97706') : '#0f766e'} stroke="#fff" strokeWidth="2" /><text x={x(i)} y={Hh - 10} textAnchor={p.points.length > 1 && i === p.points.length - 1 ? 'end' : p.points.length > 1 && i === 0 ? 'start' : 'middle'} fontSize="10" fill="#64748b">{day(pt.date)}</text></g>;
          })}
        </svg>
      </div>
      {lo !== null && hi !== null && <p className="text-[11px] text-slate-500">Shaded band: normal range {lo} – {hi} {p.unit} (from the latest report).</p>}
      <table className="w-full text-sm" aria-label={`${p.name} values`}>
        <thead><tr className="text-left text-[10px] uppercase tracking-wider text-slate-500"><th className="py-1">Date</th><th>Result</th><th>Normal range</th><th>Lab</th></tr></thead>
        <tbody>
          {[...p.points].reverse().map((pt) => (
            <tr key={pt.order_id + pt.date} className="border-t border-slate-100">
              <td className="py-1.5">{day(pt.date)}</td>
              <td className={`tabular-nums font-semibold ${pt.flag && pt.flag !== 'N' ? 'text-amber-800' : 'text-slate-900'}`}>{pt.value}{pt.flag && FLAG[pt.flag] ? ` · ${FLAG[pt.flag]}` : ''}</td>
              <td className="text-xs text-slate-600">{pt.low ?? '–'} – {pt.high ?? '–'}</td>
              <td className="text-xs text-slate-600">{pt.lab}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[11px] text-slate-500">Different labs can use slightly different methods. Discuss changes with your doctor.</p>
    </section>
  );
}
