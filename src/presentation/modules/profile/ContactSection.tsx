import React, { useState } from 'react';
import { Phone, Mail, ShieldCheck, Pencil } from 'lucide-react';
import { sendContactOtpApi, verifyContactApi } from '../../../services/patientHelper';
import { validateMobile, validateEmail } from '../../../utils/validators/india';

// Mobile number and email are how the patient signs in and gets booking updates, so changing either
// sends a code to the NEW number/email first. Nothing changes until the code is entered.
type Which = 'phone' | 'email';

export default function ContactSection({ phone, email, onChanged, toast }: {
  phone: string; email: string; onChanged: (which: Which, value: string) => void; toast: (m: string) => void;
}) {
  const [editing, setEditing] = useState<Which | null>(null);
  const [value, setValue] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const start = (w: Which) => { setEditing(w); setValue(''); setSentTo(null); setOtp(''); setErr(null); setDevOtp(null); };
  const msg = (e: any, f: string) => { const m = e?.response?.data?.message; return Array.isArray(m) ? m.join(' ') : m || f; };
  const send = async () => {
    if (editing === 'phone') {
      const mobRes = validateMobile(value);
      if (!mobRes.ok) { setErr(mobRes.message); return; }
    }
    if (editing === 'email') {
      const emailRes = validateEmail(value);
      if (!emailRes.ok) { setErr(emailRes.message); return; }
    }
    const v = editing === 'phone' ? validateMobile(value).value : validateEmail(value).value;
    setBusy(true); setErr(null);
    try { const r = await sendContactOtpApi({ [editing as string]: v }); setSentTo(v); setDevOtp(r.dev_otp || null); }
    catch (e) { setErr(msg(e, 'Could not send the code. Please try again.')); } finally { setBusy(false); }
  };
  const verify = async () => {
    if (!/^\d{6}$/.test(otp)) { setErr('Enter the 6-digit code.'); return; }
    setBusy(true); setErr(null);
    try {
      await verifyContactApi({ [editing as string]: sentTo, otp } as any);
      onChanged(editing as Which, sentTo as string);
      toast(editing === 'phone' ? 'Mobile number changed. Use it next time you log in.' : 'Email changed. Use it next time you log in.');
      setEditing(null);
    } catch (e) { setErr(msg(e, 'That code didn’t work. Please try again.')); } finally { setBusy(false); }
  };

  const row = (w: Which, Icon: React.ElementType, label: string, current: string) => (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 space-y-4 transition-colors hover:border-brand-200">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><Icon className="w-3.5 h-3.5" /> {label}</p>
          <p className="text-sm font-bold text-slate-900 mt-0.5 truncate">{current || 'Not added'}</p>
          {current && <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5"><ShieldCheck className="w-3.5 h-3.5" /> Verified · used to log in</p>}
        </div>
        {editing !== w && <button onClick={() => start(w)} className="px-3 py-2 rounded-xl bg-brand-50 hover:bg-brand-100 text-xs font-bold text-brand-800 inline-flex items-center gap-1"><Pencil className="w-3.5 h-3.5" /> {current ? 'Change' : 'Add'}</button>}
      </div>
      {editing === w && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          {!sentTo ? (<>
            <label className="text-[11px] font-bold text-slate-600">New {w === 'phone' ? 'mobile number' : 'email'}</label>
            <input autoFocus aria-label={`New ${w === 'phone' ? 'mobile number' : 'email'}`} value={value} onChange={(e) => setValue(w === 'phone' ? e.target.value.replace(/[^\d]/g, '').slice(0, 10) : e.target.value)}
              onBlur={() => {
                if (value) {
                  if (w === 'phone') {
                    const m = validateMobile(value);
                    if (!m.ok) setErr(m.message);
                  } else {
                    const em = validateEmail(value);
                    if (!em.ok) setErr(em.message);
                  }
                }
              }}
              inputMode={w === 'phone' ? 'tel' : 'email'} placeholder={w === 'phone' ? '10-digit mobile number' : 'name@example.com'}
              className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10" />
            <p className="text-[11px] text-slate-500">We’ll send a 6-digit code to the new {w === 'phone' ? 'number' : 'email'} to confirm it’s yours.</p>
          </>) : (<>
            <p className="text-xs text-slate-700">Enter the 6-digit code sent to <b>{sentTo}</b>. <button onClick={() => setSentTo(null)} className="font-bold text-teal-700 underline">Change</button></p>
            <input autoFocus aria-label="Verification code" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="6-digit code"
              className="w-40 p-2.5 rounded-xl border border-slate-200 bg-white text-sm font-black tracking-[0.3em] outline-none focus:border-teal-500" />
            {devOtp && <p className="text-[11px] text-slate-400">Test code (shown only on development): {devOtp}</p>}
          </>)}
          {err && <p role="alert" className="text-xs font-semibold text-rose-700">{err}</p>}
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditing(null)} className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 bg-white">Cancel</button>
            {!sentTo ? <button disabled={busy} onClick={send} className="px-4 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-bold disabled:opacity-60">{busy ? 'Sending…' : 'Send code'}</button>
              : <><button disabled={busy} onClick={send} className="px-3 py-1.5 rounded-lg text-xs font-bold text-teal-700">Resend</button>
                <button disabled={busy} onClick={verify} className="px-4 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-bold disabled:opacity-60">{busy ? 'Checking…' : 'Verify and save'}</button></>}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 space-y-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="border-b border-slate-100 pb-3">
        <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50"><Phone className="w-4 h-4 text-brand-700" /></span> Contact information</h3>
        <p className="text-xs text-slate-500 mt-0.5">Booking confirmations, reports and reminders go here. Both are used to log in, so changes are confirmed with a code.</p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {row('phone', Phone, 'Mobile number', phone)}
        {row('email', Mail, 'Email address', email)}
      </div>
    </div>
  );
}
