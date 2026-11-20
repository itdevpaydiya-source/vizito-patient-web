/**
 * Patient: live tracking of the doctor coming for a home visit (/home-care/track/:visitId).
 * While the doctor is "On the way" their phone shares its position; this page shows it on a map
 * with the home pin, the road distance and a rough arrival time, refreshing every 10 seconds.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowLeft, Car, CheckCircle2, Clock, MapPin, RotateCcw } from 'lucide-react';
import apiClient from '../../../services';
import { labError, myHomeVisitsApi, type MyHomeVisit } from '../../../services/labHelper';
import { formatDoctorName } from '../../../utils/doctorLabel';

type Track = {
  status: string; doctor_name: string | null; visit_date: string; visit_time: string; on_the_way_at: string | null; arrived_at: string | null;
  home: { lat: number; lng: number } | null;
  doctor: { lat: number; lng: number; accuracy_m: number | null; at: string; stale: boolean } | null;
  distance_km: number | null; eta_minutes: number | null;
};
const pin = (bg: string, inner: string) => L.divIcon({
  className: '',
  html: `<div style="width:34px;height:34px;border-radius:50%;background:${bg};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);display:grid;place-items:center;color:#fff;font:700 12px Inter,system-ui">${inner}</div>`,
  iconSize: [34, 34], iconAnchor: [17, 17],
});
const DOCTOR_PIN = pin('#C2410C', 'Dr');
const HOME_PIN = pin('#0B4F4A', '⌂');
const ago = (iso: string) => { const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000)); return s < 60 ? `${s} s ago` : `${Math.round(s / 60)} min ago`; };

function LiveMap({ t }: { t: Track }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const fitted = useRef(false);
  useEffect(() => {
    if (!box.current || map.current) return;
    const start = t.doctor || t.home || { lat: 17.385, lng: 78.4867 };
    map.current = L.map(box.current, { scrollWheelZoom: false, dragging: !L.Browser.mobile }).setView([start.lat, start.lng], 14);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => { map.current?.remove(); map.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!map.current || !layer.current) return;
    layer.current.clearLayers();
    const pts: L.LatLngExpression[] = [];
    if (t.home) { L.marker([t.home.lat, t.home.lng], { icon: HOME_PIN, keyboard: false }).bindTooltip('Your home').addTo(layer.current); pts.push([t.home.lat, t.home.lng]); }
    if (t.doctor) {
      L.marker([t.doctor.lat, t.doctor.lng], { icon: DOCTOR_PIN, keyboard: false }).bindTooltip('Doctor').addTo(layer.current);
      if (t.doctor.accuracy_m && t.doctor.accuracy_m < 2000) L.circle([t.doctor.lat, t.doctor.lng], { radius: t.doctor.accuracy_m, color: '#C2410C', weight: 1, fillOpacity: 0.08 }).addTo(layer.current);
      pts.push([t.doctor.lat, t.doctor.lng]);
    }
    if (t.home && t.doctor) L.polyline(pts, { color: '#C2410C', weight: 3, dashArray: '6 8', opacity: 0.7 }).addTo(layer.current);
    // Fit on first data, and again whenever the doctor or home drifts out of view (the doctor is moving).
    // invalidateSize first: the map may have been created before its box had its final size.
    map.current.invalidateSize();
    const outOfView = pts.some((p) => !map.current!.getBounds().pad(-0.1).contains(p));
    if (pts.length && (!fitted.current || outOfView)) { fitted.current = true; if (pts.length > 1) map.current.fitBounds(L.latLngBounds(pts), { padding: [48, 48], maxZoom: 16 }); else map.current.setView(pts[0], 15); }
  }, [t]);
  return <div ref={box} role="img" aria-label={t.doctor ? 'Map with the doctor’s live position and your home' : 'Map of your home'} className="z-0 h-[360px] w-full overflow-hidden rounded-2xl border border-[#DFE8F3] sm:h-[440px]" />;
}

export default function TrackDoctorPage() {
  const { visitId = '' } = useParams();
  const [t, setT] = useState<Track | null>(null);
  const [visit, setVisit] = useState<MyHomeVisit | null>(null);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  useEffect(() => { myHomeVisitsApi().then((l) => setVisit(l.find((v) => v.id === visitId) || null)).catch(() => undefined); }, [visitId, tick]);
  useEffect(() => {
    let alive = true;
    apiClient.get(`/home-visits/${encodeURIComponent(visitId)}/track`).then((r) => { if (alive) { setT(r.data); setError(''); } })
      .catch((e) => { if (alive) setError(labError(e, 'Live location could not be loaded.')); });
    const id = setTimeout(() => setTick((n) => n + 1), 10000);
    return () => { alive = false; clearTimeout(id); };
  }, [visitId, tick]);

  const doctor = formatDoctorName(t?.doctor_name || '') || 'Your doctor';
  // The visit's overall status (consultation started / completed) wins over the field status, which
  // stops at ARRIVED: after the visit the page said "has arrived, share your code".
  const st = visit?.status && ['IN_CONSULTATION', 'COMPLETED'].includes(visit.status) ? visit.status : t?.status;
  const onWay = st === 'ON_THE_WAY';
  const done = st === 'COMPLETED';
  const arrived = !!t && ['ARRIVED', 'IN_CONSULTATION', 'COMPLETED'].includes(String(st));
  return (
    <div className="mx-auto w-full max-w-[1000px] space-y-4 pb-12 text-[#0A1948]">
      <Link to="/home-care?tab=mine&view=doctor" className="inline-flex min-h-[40px] items-center gap-2 text-sm font-semibold text-[#C2410C]"><ArrowLeft className="h-4 w-4" />My home visits</Link>
      <h1 className="text-2xl font-extrabold tracking-tight">Track your doctor</h1>
      {error && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-[#F5C9C9] bg-[#FDF0F0] p-4 text-sm text-[#8F1D1D]">{error}<button type="button" onClick={() => setTick((n) => n + 1)} className="inline-flex items-center gap-1 font-bold underline"><RotateCcw className="h-4 w-4" />Retry</button></div>}
      {!t && !error && <div className="h-[440px] animate-pulse rounded-2xl bg-[#E9EEF5]" aria-busy="true" />}
      {t && (
        <>
          <section aria-live="polite" className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#DFE8F3] bg-white p-4">
            <span className={`grid h-12 w-12 place-items-center rounded-full ${arrived ? 'bg-[#E3F4F1] text-[#0B4F4A]' : 'bg-[#FFF1E8] text-[#C2410C]'}`}>{arrived ? <CheckCircle2 className="h-6 w-6" /> : <Car className="h-6 w-6" />}</span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold">{done ? 'Visit completed' : st === 'IN_CONSULTATION' ? `${doctor} is with you` : arrived ? `${doctor} has arrived` : onWay ? `${doctor} is on the way` : st === 'SCHEDULED' ? `${doctor} hasn’t started travelling yet` : 'This visit is not in progress'}</p>
              <p className="text-sm text-[#4E6587]">
                {onWay && t.doctor ? `${t.distance_km != null ? `About ${t.distance_km} km away · ` : ''}${t.eta_minutes != null ? `arriving in about ${t.eta_minutes} min · ` : ''}updated ${ago(t.doctor.at)}${t.doctor.stale ? ' (signal lost — showing last known place)' : ''}`
                  : onWay ? 'Waiting for the doctor’s phone to share its location…'
                    : done ? 'Your prescription and visit notes are in Medical Records.' : st === 'IN_CONSULTATION' ? 'Consultation in progress.' : arrived ? 'Visit code checked. The doctor is with you.' : 'You’ll see the doctor here once they start travelling.'}
              </p>
            </div>
            {visit?.visit_code && (st === 'SCHEDULED' || st === 'ON_THE_WAY') && (
              <div className="text-right"><p className="text-[11px] font-semibold text-[#4E6587]">Visit code</p><p className="text-2xl font-black tracking-[0.3em] text-[#0B4F4A] tabular-nums">{visit.visit_code}</p></div>
            )}
          </section>
          {done ? (
            <Link to="/my-records" className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#C2410C] px-4 text-sm font-bold text-white">View prescription in Medical Records</Link>
          ) : (<>
          {(t.home || t.doctor) ? <LiveMap t={t} /> : <p className="rounded-2xl border border-[#DFE8F3] bg-white p-4 text-sm text-[#33476B]">Your home wasn’t pinned on the map, so only the doctor’s status is shown.</p>}
          <div className="flex flex-wrap gap-4 text-xs text-[#4E6587]">
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-[#C2410C]" />Doctor</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-[#0B4F4A]" />Your home</span>
            <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />Arrival time is an estimate for city traffic</span>
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />Refreshes every 10 seconds</span>
          </div>
          <p role="note" className="rounded-xl border border-[#F5C9C9] bg-[#FDF0F0] px-4 py-3 text-[13px] text-[#8F1D1D]">If the patient gets worse while you wait — chest pain, breathlessness, fainting — call <a href="tel:108" className="font-bold underline">108</a> now.</p>
          </>)}
        </>
      )}
    </div>
  );
}
