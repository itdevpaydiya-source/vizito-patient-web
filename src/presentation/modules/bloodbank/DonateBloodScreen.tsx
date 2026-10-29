import VizitoDialog from '../../components/dialogs/VizitoDialog';
import ThemedSelect from '../../components/forms/ThemedSelect';
import { Link, useSearchParams } from "react-router-dom";
import VizitoPagination from "../../components/navigation/VizitoPagination";
import "./bloodbank.css";
import {
  BankMark,
  DonationIllustration,
  useBloodBankLogos,
} from "./BloodVisuals";
import { useCallback, useEffect, useState } from "react";
import { Award, HeartHandshake, MapPin, RotateCcw, X } from "lucide-react";
import {
  bloodError,
  bloodReferenceApi,
  donorBookApi,
  donorCancelApi,
  donorCertificateApi,
  donorMeApi,
  donorHistoryApi,
  donorRegisterApi,
  donorSessionsApi,
  type BloodReference,
  type DonorCertificate,
  type DonorMe,
  type DonorSessionRow,
} from "../../../services/bloodbankHelper";

// Donate blood: register as a donor (your Vizito account), book a session or camp at a verified blood
// bank, see your bookings and donations, print a certificate. The blood bank checks eligibility on the day.
// Test results are never shown here.
const fmt = (s: string) =>
  new Date(s).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
const sel =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800";

const DonateBloodScreen = () => {
  const [searchParams,setSearchParams]=useSearchParams();
  const historyPage=Math.max(1,Number(searchParams.get("donorPage"))||1),historyPageSize=(Number(searchParams.get("donorPageSize"))===20?20:10) as 10|20;
  const logos = useBloodBankLogos();
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [me, setMe] = useState<DonorMe | null>(null);
  const [sessions, setSessions] = useState<DonorSessionRow[]>([]);
  const [ref, setRef] = useState<BloodReference | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [group, setGroup] = useState("");
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [criteria, setCriteria] = useState(false);
  const [certificate, setCertificate] = useState<DonorCertificate | null>(null);
  const [appointmentHistory,setAppointmentHistory]=useState<NonNullable<DonorMe["appointments"]>>([]),[historyTotal,setHistoryTotal]=useState(0);

  const load = useCallback(async () => {
    try {
      const [m, s] = await Promise.all([donorMeApi(), donorSessionsApi()]);
      setMe(m);
      setSessions(s);
      setError(null);
    } catch (e) {
      setError(bloodError(e, "Could not load donor details."));
    }
  }, []);
  useEffect(() => {
    load();
    bloodReferenceApi()
      .then(setRef)
      .catch(() => undefined);
  }, [load]);
  useEffect(()=>{donorHistoryApi({type:"appointments",page:historyPage,page_size:historyPageSize}).then(r=>{setAppointmentHistory(r.items as NonNullable<DonorMe["appointments"]>);setHistoryTotal(r.total);}).catch(e=>setError(bloodError(e,"Could not load donation appointment history.")));},[historyPage,historyPageSize]);
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      await fn();
      setMsg(ok);
      await load();
    } catch (e) {
      setError(bloodError(e, "That didn’t work."));
    } finally {
      setBusy(false);
    }
  };
  const openCertificate = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      setCertificate(await donorCertificateApi(id));
    } catch (e) {
      setError(bloodError(e, "Could not open the certificate."));
    } finally {
      setBusy(false);
    }
  };

  const lastDonation = me?.donations?.reduce<string | null>(
    (latest, d) =>
      !latest || new Date(d.collected_at) > new Date(latest)
        ? d.collected_at
        : latest,
    null,
  );
  const gapDays = lastDonation
    ? Math.floor((Date.now() - new Date(lastDonation).getTime()) / 86400000)
    : null;
  const eligibility = [
    "Age between 18-65 years",
    "Weight 50 kg or more",
    gapDays === null
      ? "I have not donated in the last 90 days"
      : `Last recorded donation: ${new Date(lastDonation!).toLocaleDateString("en-IN")} (${gapDays} days ago)`,
    "No fever, infection or major illness in the last 14 days",
    "No long-term medication requiring donation review (for example, blood thinners)",
  ];
  const eligible =
    eligibility.every((_, i) => checks[String(i)]) &&
    (gapDays === null || gapDays >= 90);
  const upcoming = me?.appointments?.find((a) =>
    ["BOOKED", "CHECKED_IN", "ELIGIBLE"].includes(a.status),
  );
  return (
    <div className="bb-page bb-donate bb-stack" style={{ maxWidth: 900 }}>
      <nav className="bb-crumb">
        <Link to="/dashboard">Dashboard</Link> &rsaquo;{" "}
        <Link to="/find-blood">Blood Bank</Link> &rsaquo; Donate blood
      </nav>
      <div className="bb-hero">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <HeartHandshake className="w-6 h-6 text-rose-600" /> Donate blood
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            A safe and simple way to save lives.
          </p>
        </div>
        <DonationIllustration />
      </div>
      <section className="bb-card bb-stack">
        <h2>Am I eligible to donate?</h2>
        <ul className="bb-checklist">
          {eligibility.map((text, i) => (
            <li key={i}>
              <label>
                <input
                  type="checkbox"
                  checked={!!checks[String(i)]}
                  disabled={i === 2 && gapDays !== null && gapDays < 90}
                  onChange={(e) =>
                    setChecks({ ...checks, [String(i)]: e.target.checked })
                  }
                />
                {text}
              </label>
            </li>
          ))}
        </ul>
        <p className="bb-muted">
          Confirm these before registering or booking. Tell the blood bank about
          donations made elsewhere. For whole blood, women generally need a
          120-day interval and men 90 days; first-time donors over 60 need
          review. Their clinician makes the final eligibility decision.
        </p>
        <button className="bb-link" onClick={() => setCriteria((c) => !c)}>
          View detailed eligibility criteria &rarr;
        </button>
        {criteria && (
          <div className="bb-info">
            Eligibility also depends on haemoglobin, recent procedures, travel,
            pregnancy and your health history. Discuss illness and medication
            with the blood bank; do not stop prescribed medication to donate.{" "}
            <a
              className="bb-link"
              target="_blank"
              rel="noreferrer"
              href="https://eraktkosh.mohfw.gov.in/BLDAHIMS/bloodbank/transactions/bbpublicindex.html"
            >
              Read the official e-RaktKosh donor information
            </a>
            .
          </div>
        )}
      </section>
      {error && (
        <p role="alert" className="text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}
      {msg && (
        <p role="status" className="text-sm font-semibold text-emerald-700">
          {msg}
        </p>
      )}
      {!me ? (
        error ? (
          <button
            onClick={load}
            className="inline-flex items-center gap-1 text-sm font-bold"
          >
            <RotateCcw className="w-4 h-4" /> Retry
          </button>
        ) : (
          <p className="text-sm text-slate-400">Loading…</p>
        )
      ) : !me.registered ? (
        <section
          aria-label="Register as a donor"
          className="bb-donor-registration bb-card bb-stack"
        >
          <h2 className="font-black text-slate-900">Register as a donor</h2>
          <p>
            Create your donor profile and help save lives. View upcoming
            donation camps below.
          </p>
          <label className="block text-xs font-bold text-slate-700">
            Your blood group, if you know it (optional)
            <ThemedSelect
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              className={`${sel} mt-1`}
            >
              <option value="">I don’t know</option>
              {ref?.groups.map((g) => (
                <option key={g.code} value={g.code}>
                  {g.code}
                </option>
              ))}
            </ThemedSelect>
          </label>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1"
            />{" "}
            I agree to register as a voluntary blood donor and for blood banks I
            book with to see my name, phone number and booking.
          </label>
          <p className="text-xs text-slate-400">
            Your consent is recorded with your donor registration.
          </p>
          <button
            disabled={busy || !consent || !eligible}
            onClick={() =>
              run(
                () =>
                  donorRegisterApi({
                    declared_group: group || undefined,
                    consent,
                  }),
                "You are registered as a donor.",
              )
            }
            className="bb-btn bb-teal"
          >
            Register now
          </button>
        </section>
      ) : (
        <>
          <section className="bb-donor-registration bb-card">
            <h2>Register as a donor</h2>
            <p className="text-sm text-slate-600">
              Registered as a donor - Donor ID <b>{me.donor?.donor_code}</b>
              {me.donor?.declared_group
                ? ` · you said ${me.donor.declared_group}`
                : ""}
            </p>
            <p className="bb-muted">
              Your donor profile is active. Check your eligibility and book an
              upcoming camp.
            </p>
          </section>
          {upcoming && (
            <section
              aria-label="Your booking"
              className="bg-rose-50 rounded-2xl border border-rose-200 p-4 space-y-1"
            >
              <h2>Your booking</h2>
              <p className="font-black text-rose-900">
                {upcoming.status_label}: {upcoming.session?.title}
              </p>
              <p className="text-sm text-rose-900">
                {upcoming.centre} ·{" "}
                {upcoming.session && fmt(upcoming.session.starts_at)}
                {upcoming.session?.venue ? ` · ${upcoming.session.venue}` : ""}
              </p>
              {upcoming.can_cancel ? (
                <button
                  disabled={busy}
                  onClick={() =>
                    run(() => donorCancelApi(upcoming.id), "Booking cancelled.")
                  }
                  className="text-sm font-bold text-rose-800 underline"
                >
                  Cancel booking
                </button>
              ) : (
                <p className="text-xs text-rose-700">
                  This booking can no longer be cancelled because the session
                  has ended or the donation has progressed.
                </p>
              )}
            </section>
          )}
        </>
      )}
      {me && !upcoming && (
        <section aria-label="Sessions and camps" className="space-y-2">
          <div className="bb-row">
            <h2>Upcoming blood donation camps and sessions</h2>
            {sessions.length > 3 && (
              <button
                className="bb-link"
                onClick={() => setShowAllSessions((v) => !v)}
              >
                {showAllSessions ? "View fewer" : "View all"}
              </button>
            )}
          </div>
          {!sessions.length && (
            <p className="text-sm text-slate-500 bg-white rounded-2xl border border-slate-200 p-4">
              No open sessions right now. Check back soon.
            </p>
          )}
          {(showAllSessions ? sessions : sessions.slice(0, 3)).map((s) => (
            <article
              key={s.id}
              aria-label={s.title}
              className="bb-card bb-camp"
            >
              <BankMark
                name={s.centre.name || s.organizer || s.title}
                src={logos[s.centre.partner_id]}
              />
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-black text-slate-900">{s.title}</h3>
                <span className="text-xs font-bold text-rose-700">
                  {s.kind === "CAMP" ? "Camp" : "At the blood bank"}
                </span>
              </div>
              <p className="text-sm text-slate-600">
                {s.organizer || s.centre.name} · {fmt(s.starts_at)}–
                {new Date(s.ends_at).toLocaleTimeString("en-IN", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
              {s.venue && (
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {s.venue}
                </p>
              )}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-500">
                  {s.places_left} slots left
                </span>
                <button
                  disabled={
                    busy || !eligible || !me.registered || s.places_left < 1
                  }
                  onClick={() =>
                    run(
                      () => donorBookApi({ session_id: s.id }),
                      "Booked. See you there!",
                    )
                  }
                  className="bb-btn bb-book-slot"
                >
                  Book slot
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
      {me && (
        <>
          <section aria-label="Donation appointment history" className="space-y-2">
            <h2 className="font-black text-slate-900">Appointment history</h2>
            {!appointmentHistory.length?<p className="text-sm text-slate-500">No previous donation appointments.</p>:appointmentHistory.map(a=><div key={a.id} className="bg-white rounded-2xl border border-slate-200 p-3"><p className="font-semibold text-slate-800">{a.session?.title||a.centre||"Donation appointment"}</p><p className="text-xs text-slate-500">{a.status_label}{a.session?.starts_at?` · ${fmt(a.session.starts_at)}`:""}</p></div>)}
            <VizitoPagination page={historyPage} pageSize={historyPageSize} total={historyTotal} label="donor appointments" onPageChange={value=>setSearchParams(current=>{const next=new URLSearchParams(current);value===1?next.delete("donorPage"):next.set("donorPage",String(value));return next;})} onPageSizeChange={value=>setSearchParams(current=>{const next=new URLSearchParams(current);next.set("donorPageSize",String(value));next.delete("donorPage");return next;})}/>
          </section>
          <section aria-label="Your donations" className="space-y-2">
            <h2 className="font-black text-slate-900">Your donations</h2>
            {!me.donations?.length ? (
              <p className="text-sm text-slate-500">No donations yet.</p>
            ) : (
              me.donations.map((d) => (
                <div
                  key={d.id}
                  className="bg-white rounded-2xl border border-slate-200 p-3 flex items-center justify-between gap-2"
                >
                  <div>
                    <p className="font-semibold text-slate-800">
                      {new Date(d.collected_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      · {d.centre}
                    </p>
                    {d.session && (
                      <p className="text-xs text-slate-500">{d.session}</p>
                    )}
                  </div>
                  <button
                    disabled={busy}
                    onClick={() => openCertificate(d.id)}
                    className="inline-flex items-center gap-1 rounded-xl border border-rose-200 px-3 py-2 text-sm font-bold text-rose-700 disabled:opacity-50"
                  >
                    <Award className="w-4 h-4" /> Donation certificate
                  </button>
                </div>
              ))
            )}
            {me.appointments
              ?.filter((a) => a.status === "DEFERRED")
              .slice(0, 1)
              .map((a) => (
                <p key={a.id} className="text-sm text-slate-600">
                  At your last visit the blood bank asked you not to donate this
                  time
                  {a.deferred_until
                    ? `; you can book again after ${a.deferred_until}`
                    : ""}
                  . Ask them if you have questions.
                </p>
              ))}
          </section>
        </>
      )}
      {certificate && (
        <VizitoDialog title="Certificate of Blood Donation" onClose={() => setCertificate(null)} className="portal-migrated">
<div className="flex justify-end">
              <button
                aria-label="Close certificate"
                onClick={() => setCertificate(null)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

<div className="border-4 border-double border-rose-700 px-6 py-10 text-center">
              <Award className="mx-auto mb-3 h-10 w-10 text-rose-700" />
              <h2 className="text-2xl font-black">
                Certificate of Blood Donation
              </h2>
              <p className="mt-5 text-sm text-slate-600">This certifies that</p>
              <p className="mt-1 text-xl font-black">
                {certificate.donor_name || certificate.donor_code}
              </p>
              <p className="mt-4">
                donated blood at <b>{certificate.centre}</b> on{" "}
                <b>
                  {new Date(certificate.donated_on).toLocaleDateString(
                    "en-IN",
                    { day: "numeric", month: "long", year: "numeric" },
                  )}
                </b>
                .
              </p>
              <p className="mt-4">Thank you for helping save lives.</p>
              <p className="mt-6 text-xs text-slate-500">
                Certificate {certificate.certificate_no} · Donor{" "}
                {certificate.donor_code} · issued via Vizito
              </p>
            </div>

<button
              onClick={() => window.print()}
              className="mt-4 w-full rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white"
            >
              Print certificate
            </button>
</VizitoDialog>
      )}
    </div>
  );
};

export default DonateBloodScreen;
