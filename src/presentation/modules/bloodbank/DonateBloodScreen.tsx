import { useCallback, useEffect, useState } from 'react';
import { Award, HeartHandshake, MapPin, RotateCcw, X } from 'lucide-react';
import {
  bloodError, bloodReferenceApi, donorBookApi, donorCancelApi, donorCertificateApi, donorMeApi, donorRegisterApi, donorSessionsApi,
  type BloodReference, type DonorCertificate, type DonorMe, type DonorSessionRow,
} from '../../../services/bloodbankHelper';

// Donate blood: register as a donor (your Vizito account), book a session or camp at a verified blood
// bank, see your bookings and donations, print a certificate. The blood bank checks eligibility on the day.
// Test results are never shown here.
const fmt = (s: string) => new Date(s).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' });
const sel = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800';

const DonateBloodScreen = () => {
  const [me, setMe] = useState<DonorMe | null>(null);
  const [sessions, setSessions] = useState<DonorSessionRow[]>([]);
  const [ref, setRef] = useState<BloodReference | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [group, setGroup] = useState('');
  const [certificate, setCertificate] = useState<DonorCertificate | null>(null);

  const load = useCallback(async () => {
    try { const [m, s] = await Promise.all([donorMeApi(), donorSessionsApi()]); setMe(m); setSessions(s); setError(null); }
    catch (e) { setError(bloodError(e, 'Could not load donor details.')); }
  }, []);
  useEffect(() => { load(); bloodReferenceApi().then(setRef).catch(() => undefined); }, [load]);
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true); setError(null); setMsg(null);
    try { await fn(); setMsg(ok); await load(); } catch (e) { setError(bloodError(e, 'That didn’t work.')); } finally { setBusy(false); }
  };
  const openCertificate = async (id: string) => {
    setBusy(true); setError(null);
    try {
      setCertificate(await donorCertificateApi(id));
    } catch (e) { setError(bloodError(e, 'Could not open the certificate.')); }
    finally { setBusy(false); }
  };

  const upcoming = me?.appointments?.find((a) => ['BOOKED', 'CHECKED_IN', 'ELIGIBLE'].includes(a.status));
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><HeartHandshake className="w-6 h-6 text-rose-600" /> Donate blood</h1>
        <p className="text-sm text-slate-500 mt-1">Book a donation session or camp at a verified blood bank. Their staff check whether you can donate on the day.</p>
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-rose-700">{error}</p>}
      {msg && <p role="status" className="text-sm font-semibold text-emerald-700">{msg}</p>}
      {!me ? (error ? <button onClick={load} className="inline-flex items-center gap-1 text-sm font-bold"><RotateCcw className="w-4 h-4" /> Retry</button> : <p className="text-sm text-slate-400">Loading…</p>) : !me.registered ? (
        <section aria-label="Register as a donor" className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <h2 className="font-black text-slate-900">Become a donor</h2>
          <label className="block text-xs font-bold text-slate-700">Your blood group, if you know it (optional)
            <select value={group} onChange={(e) => setGroup(e.target.value)} className={`${sel} mt-1`}><option value="">I don’t know</option>{ref?.groups.map((g) => <option key={g.code} value={g.code}>{g.code}</option>)}</select>
          </label>
          <label className="flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" /> I agree to register as a voluntary blood donor and for blood banks I book with to see my name, phone number and booking.</label>
          <p className="text-xs text-slate-400">Consent wording is under legal review and may be updated; you will be asked again if it changes.</p>
          <button disabled={busy || !consent} onClick={() => run(() => donorRegisterApi({ declared_group: group || undefined, consent }), 'You are registered as a donor.')} className="w-full rounded-xl bg-rose-600 py-3 text-sm font-bold text-white disabled:opacity-50">Register</button>
        </section>
      ) : (
        <>
          <p className="text-sm text-slate-600">Donor ID <b>{me.donor?.donor_code}</b>{me.donor?.declared_group ? ` · you said ${me.donor.declared_group}` : ''}</p>
          {upcoming && (
            <section aria-label="Your booking" className="bg-rose-50 rounded-2xl border border-rose-200 p-4 space-y-1">
              <p className="font-black text-rose-900">{upcoming.status_label}: {upcoming.session?.title}</p>
              <p className="text-sm text-rose-900">{upcoming.centre} · {upcoming.session && fmt(upcoming.session.starts_at)}{upcoming.session?.venue ? ` · ${upcoming.session.venue}` : ''}</p>
              {upcoming.can_cancel
                ? <button disabled={busy} onClick={() => run(() => donorCancelApi(upcoming.id), 'Booking cancelled.')} className="text-sm font-bold text-rose-800 underline">Cancel booking</button>
                : <p className="text-xs text-rose-700">This booking can no longer be cancelled because the session has ended or the donation has progressed.</p>}
            </section>
          )}
          {!upcoming && (
            <section aria-label="Sessions and camps" className="space-y-2">
              <h2 className="font-black text-slate-900">Sessions and camps</h2>
              {!sessions.length && <p className="text-sm text-slate-500 bg-white rounded-2xl border border-slate-200 p-4">No open sessions right now. Check back soon.</p>}
              {sessions.map((s) => (
                <article key={s.id} aria-label={s.title} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1">
                  <div className="flex items-center justify-between gap-2"><h3 className="font-black text-slate-900">{s.title}</h3><span className="text-xs font-bold text-rose-700">{s.kind === 'CAMP' ? 'Camp' : 'At the blood bank'}</span></div>
                  <p className="text-sm text-slate-600">{s.centre.name} · {fmt(s.starts_at)}–{new Date(s.ends_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</p>
                  {s.venue && <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {s.venue}</p>}
                  <div className="flex items-center justify-between pt-1"><span className="text-xs text-slate-500">{s.places_left} places left</span>
                    <button disabled={busy} onClick={() => run(() => donorBookApi({ session_id: s.id }), 'Booked. See you there!')} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Book</button>
                  </div>
                </article>
              ))}
            </section>
          )}
          <section aria-label="Your donations" className="space-y-2">
            <h2 className="font-black text-slate-900">Your donations</h2>
            {!me.donations?.length ? <p className="text-sm text-slate-500">No donations yet.</p> : me.donations.map((d) => (
              <div key={d.id} className="bg-white rounded-2xl border border-slate-200 p-3 flex items-center justify-between gap-2">
                <div><p className="font-semibold text-slate-800">{new Date(d.collected_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {d.centre}</p>{d.session && <p className="text-xs text-slate-500">{d.session}</p>}</div>
                <button disabled={busy} onClick={() => openCertificate(d.id)} className="inline-flex items-center gap-1 rounded-xl border border-rose-200 px-3 py-2 text-sm font-bold text-rose-700 disabled:opacity-50"><Award className="w-4 h-4" /> Certificate</button>
              </div>
            ))}
            {me.appointments?.filter((a) => a.status === 'DEFERRED').slice(0, 1).map((a) => <p key={a.id} className="text-sm text-slate-600">At your last visit the blood bank asked you not to donate this time{a.deferred_until ? `; you can book again after ${a.deferred_until}` : ''}. Ask them if you have questions.</p>)}
          </section>
        </>
      )}
      {certificate && (
        <div role="dialog" aria-modal="true" aria-label="Blood donation certificate" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex justify-end"><button aria-label="Close certificate" onClick={() => setCertificate(null)}><X className="h-5 w-5" /></button></div>
            <div className="border-4 border-double border-rose-700 px-6 py-10 text-center">
              <Award className="mx-auto mb-3 h-10 w-10 text-rose-700" />
              <h2 className="text-2xl font-black">Certificate of Blood Donation</h2>
              <p className="mt-5 text-sm text-slate-600">This certifies that</p>
              <p className="mt-1 text-xl font-black">{certificate.donor_name || certificate.donor_code}</p>
              <p className="mt-4">donated blood at <b>{certificate.centre}</b> on <b>{new Date(certificate.donated_on).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</b>.</p>
              <p className="mt-4">Thank you for helping save lives.</p>
              <p className="mt-6 text-xs text-slate-500">Certificate {certificate.certificate_no} · Donor {certificate.donor_code} · issued via Vizito</p>
            </div>
            <button onClick={() => window.print()} className="mt-4 w-full rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white">Print certificate</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DonateBloodScreen;
