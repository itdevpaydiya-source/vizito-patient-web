import ThemedSelect from '../../components/forms/ThemedSelect';
import BookingForChip,{useFamilyBookingSelection} from '../family/BookingForChip';
﻿import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FileUp, FileText } from "lucide-react";
import { BankMark, useBloodBankLogos } from "./BloodVisuals";
import {
  bloodReferenceApi,
  bloodGridApi,
  bloodQuoteApi,
  uploadRequisitionApi,
  createBloodRequestApi,
  bloodError,
  newIdempotencyKey,
  type BloodReference,
  type BloodGridCentre,
  type BloodQuote,
  type Requisition,
  type MyBloodRequest,
} from "../../../services/bloodbankHelper";
import {
  getPatientProfileApi,
  type PatientProfileData,
} from "../../../services/patientHelper";
import {
  getFamilyMembersApi,
  ageFromDob,
  type PatientFamilyMember,
} from "../../../services/familyHelper";
import { componentLabel } from "./FindBloodScreen";
import "./bloodbank.css";
const money = (n: number | null) =>
  n === null
    ? "Charge confirmed by the blood bank"
    : `₹${n.toLocaleString("en-IN")}`;
export default function RequestBloodScreen() {
  const logos = useBloodBankLogos();
  const [params] = useSearchParams();
  const [bankId, setBankId] = useState(params.get("bank") || ""),
    [banks, setBanks] = useState<BloodGridCentre[]>([]),
    [changing, setChanging] = useState(false),
    [ref, setRef] = useState<BloodReference | null>(null),
    [profile, setProfile] = useState<PatientProfileData | null>(null),
    [family, setFamily] = useState<PatientFamilyMember[]>([]),
    [who, setWho] = useState("Myself"),
    [familyId, setFamilyId] = useState(""),
    [recipient, setRecipient] = useState({ name: "", age: "", gender: "" }),
    [group, setGroup] = useState(params.get("group") || ""),
    [component, setComponent] = useState(params.get("component") || ""),
    [quantity, setQuantity] = useState(1),
    [urgency, setUrgency] = useState("Within 24 hours"),
    [hospital, setHospital] = useState(""),
    [doctor, setDoctor] = useState(""),
    [planned, setPlanned] = useState(() => new Date(Date.now()+86400000).toLocaleDateString("en-CA")),
    [plannedTime, setPlannedTime] = useState("10:00"),
    [reason, setReason] = useState(""),
    [preference, setPreference] = useState(""),
    [requisition, setRequisition] = useState<
      (Requisition & { size_bytes: number }) | null
    >(null),
    [quote, setQuote] = useState<BloodQuote | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [step, setStep] = useState(0),
    [created, setCreated] = useState<MyBloodRequest | null>(null),
    [retry, setRetry] = useState(0);
  const attempt = useMemo(
    () => newIdempotencyKey(),
    [
      bankId,
      who,
      familyId,
      recipient.name,
      recipient.age,
      recipient.gender,
      group,
      component,
      quantity,
      urgency,
      hospital,
      doctor,
      planned,
      reason,
      preference,
      requisition?.id,
    ],
  );
  useEffect(() => {
    let alive = true;
    Promise.all([bloodReferenceApi(), bloodGridApi({}), getPatientProfileApi()])
      .then(async ([r, g, p]) => {
        if (!alive) return;
        setRef(r);
        setBanks(g.centres);
        setBankId((current) => current || g.centres.find((centre) => centre.any_in_stock)?.partner_id || g.centres[0]?.partner_id || "");
        setProfile(p);
        setComponent((c) => c || r.components[0]?.code || "");
        if (p) {
          const f = await getFamilyMembersApi(p.userId);
          if (alive) setFamily(f);
        }
      })
      .catch((e) => setError(bloodError(e, "Could not load request details.")));
    return () => {
      alive = false;
    };
  }, [retry]);
  useEffect(() => {
    if (!bankId || !component) return;
    let alive = true;
    setQuote(null);
    bloodQuoteApi({
      bloodbank_partner_id: bankId,
      component_code: component,
      quantity,
    })
      .then((q) => {
        if (alive) {
          setQuote(q);
          setPreference((p) =>
            q.payment_methods.some((m) => m.code === p)
              ? p
              : q.payment_methods[0]?.code || "",
          );
        }
      })
      .catch((e) => {
        if (alive)
          setError(bloodError(e, "Could not load processing charges."));
      });
    return () => {
      alive = false;
    };
  }, [bankId, component, quantity, retry]);
  useFamilyBookingSelection(family,v=>{setFamilyId(v);setWho(v?'Family member':'Myself');});
  const member = family.find((m) => String(m.memberUserId) === familyId);
  const name =
    who === "Other"
      ? recipient.name
      : who === "Family member"
        ? member?.name
        : profile?.fullName;
  const age =
    who === "Other"
      ? recipient.age
      : who === "Family member"
        ? member?.age
        : ageFromDob(profile?.dateOfBirth || null);
  const gender =
    who === "Other"
      ? recipient.gender
      : who === "Family member"
        ? member?.gender
        : profile?.gender;
  const bank = banks.find((b) => b.partner_id === bankId);
  const upload = async (file?: File) => {
    if (!file) return;
    if (
      !["application/pdf", "image/jpeg", "image/png"].includes(file.type) ||
      file.size > 10 * 1024 * 1024
    ) {
      setError("Upload a PDF, JPG or PNG up to 10 MB.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      setRequisition({
        ...(await uploadRequisitionApi(
          file,
          who === "Family member" ? familyId : undefined,
        )),
        size_bytes: file.size,
      });
    } catch (e) {
      setError(bloodError(e, "Could not upload requisition."));
    } finally {
      setBusy(false);
    }
  };
  const review = (e: FormEvent) => {
    e.preventDefault();
    if (
      !bankId ||
      !requisition ||
      !quote ||
      (who === "Family member" && !familyId)
    ) {
      setError(
        "Choose a blood bank, patient and requisition, and wait for processing charges.",
      );
      return;
    }
    if (urgency === "Emergency" && reason.trim().length < 5) {
      setError("Say briefly why this is an emergency (at least 5 characters).");
      return;
    }
    setError("");
    setStep(1);
    window.scrollTo(0, 0);
  };
  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await createBloodRequestApi(
        {
          bloodbank_partner_id: bankId,
          requisition_id: requisition?.id,
          family_member_id: who === "Family member" ? familyId : undefined,
          recipient:
            who === "Other"
              ? { ...recipient, age: Number(recipient.age) }
              : undefined,
          requested_group: group,
          component_code: component,
          quantity,
          urgency: urgency === "Planned" ? "ROUTINE" : "URGENT",
          is_emergency: urgency === "Emergency",
          emergency_reason: urgency === "Emergency" ? reason : undefined,
          admitted_hospital: hospital,
          treating_doctor: doctor,
          planned_at:
            planned
              ? new Date(`${planned}T${plannedTime}:00+05:30`).toISOString()
              : undefined,
          payment_preference: preference,
        },
        attempt,
      );
      setCreated(r);
      setStep(2);
      window.scrollTo(0, 0);
    } catch (e) {
      setError(bloodError(e, "Could not submit request."));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="bb-page bb-request bb-request-v2 bb-stack" style={{ maxWidth: 1100 }}>
      <nav className="bb-crumb">
        <Link to="/dashboard">Dashboard</Link> ›{" "}
        <Link to="/find-blood">Blood Bank</Link> › Request Blood
      </nav>
      <h1>{bank ? `Request blood from ${bank.name}` : "Request blood"}</h1><BookingForChip family={family} value={who==='Family member'?familyId:''} onChange={v=>{setFamilyId(v);setWho(v?'Family member':'Myself');}}/>
      <ol className="bb-steps">
        {["Details", "Review & pay", "Confirmation"].map((s, i) => (
          <li key={s} aria-current={step === i ? "step" : undefined}>
            <b>{i + 1}</b>
            {s}
          </li>
        ))}
      </ol>
      {error && (
        <div role="alert" className="bb-error">
          {error}{" "}
          <button className="bb-btn" onClick={() => setRetry((n) => n + 1)}>
            Retry
          </button>
        </div>
      )}
      {step === 2 && created ? (
        <section className="bb-card bb-stack">
          <div className="bb-ready">
            <h2>Request submitted</h2>
            <p>{created.request_number}</p>
          </div>
          <p>
            {created.bloodbank_name} will review the doctor’s requisition and
            contact you about matching.
          </p>
          <p>
            Payment is due only when blood is matched and ready.{" "}
            {preference === "AT_BANK"
              ? "You chose to pay at the blood bank."
              : "You chose to pay online when ready."}
          </p>
          <Link
            className="bb-btn bb-primary"
            to={`/blood-requests?open=${created.id}`}
          >
            View my request
          </Link>
        </section>
      ) : (
        <>
          <section className="bb-card bb-stack">
            <div className="bb-row">
              <h2>Selected blood bank</h2>
              <button
                className="bb-link"
                onClick={() => setChanging((c) => !c)}
              >
                Change
              </button>
            </div>
            {bank ? (
              <div className="bb-bank">
                <BankMark name={bank.name} src={logos[bank.partner_id]} />
                <div>
                  <h3>{bank.name}</h3>
                  <p className="bb-muted">
                    {bank.address || "Address not provided"} · Licence No.{" "}
                    {bank.licence_number || "Not provided"}
                  </p>
                  {bank.is_24x7 && <span className="bb-badge">24 × 7</span>}
                  {bank.any_in_stock && <span className="bb-badge">Nearest centre with stock</span>}
                </div>
              </div>
            ) : (
              <p>Choose a blood bank to continue.</p>
            )}
            {(!bankId || changing) && (
              <label>
                Blood bank
                <ThemedSelect
                  aria-label="Blood bank"
                  value={bankId}
                  onChange={(e) => {
                    setBankId(e.target.value);
                    setChanging(false);
                    setStep(0);
                  }}
                >
                  <option value="">Choose bank</option>
                  {banks.map((b) => (
                    <option key={b.partner_id} value={b.partner_id}>
                      {b.name}
                    </option>
                  ))}
                </ThemedSelect>
              </label>
            )}
          </section>
          {step === 0 ? (
            <form className="bb-stack bb-request-form-grid" onSubmit={review}>
              <section className="bb-card bb-stack">
                <h2>Who is this request for?</h2>
                <div className="bb-chips bb-recipient-options">
                  {["Myself", "Family member", "Other"].map((w) => (
                    <button
                      type="button"
                      key={w}
                      className="bb-chip"
                      aria-pressed={who === w}
                      onClick={() => {
                        setWho(w);
                        setRequisition(null);
                      }}
                    >
                      {w}
                    </button>
                  ))}
                </div>
                {who === "Family member" && (
                  <label>
                    Family member
                    <ThemedSelect
                      required
                      aria-label="Family member"
                      value={familyId}
                      onChange={(e) => {
                        setFamilyId(e.target.value);
                        setRequisition(null);
                      }}
                    >
                      <option value="">Choose family member</option>
                      {family.map((m) => (
                        <option key={m.memberUserId} value={m.memberUserId}>
                          {m.name} ({m.relationship})
                        </option>
                      ))}
                    </ThemedSelect>
                  </label>
                )}
                <h2>Patient details</h2>
                <div className="bb-fields bb-patient-fields">
                  <label>
                    Patient name
                    <input
                      required
                      aria-label="Patient name"
                      value={name || ""}
                      readOnly={who !== "Other"}
                      onChange={(e) =>
                        setRecipient({ ...recipient, name: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Age
                    <input
                      required={who === "Other"}
                      type="number"
                      min="0"
                      max="120"
                      aria-label="Age"
                      value={age ?? ""}
                      readOnly={who !== "Other"}
                      placeholder="Not recorded"
                      onChange={(e) =>
                        setRecipient({ ...recipient, age: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Gender
                    {who === "Other" ? (
                      <ThemedSelect
                        required
                        aria-label="Gender"
                        value={recipient.gender}
                        onChange={(e) =>
                          setRecipient({ ...recipient, gender: e.target.value })
                        }
                      >
                        <option value="">Choose</option>
                        {["MALE", "FEMALE", "OTHER"].map((g) => (
                          <option key={g}>{g}</option>
                        ))}
                      </ThemedSelect>
                    ) : (
                      <input
                        aria-label="Gender"
                        readOnly
                        value={gender || "Not recorded"}
                      />
                    )}
                  </label>
                  <label>
                    Blood group
                    <ThemedSelect
                      required
                      aria-label="Blood group"
                      value={group}
                      onChange={(e) => setGroup(e.target.value)}
                    >
                      <option value="">Choose</option>
                      {ref?.groups.map((g) => (
                        <option key={g.code}>{g.code}</option>
                      ))}
                    </ThemedSelect>
                  </label>
                  <label>
                    Component required
                    <ThemedSelect
                      required
                      aria-label="Component required"
                      value={component}
                      onChange={(e) => setComponent(e.target.value)}
                    >
                      {ref?.components.map((c) => (
                        <option value={c.code} key={c.code}>
                          {componentLabel(c.code, c.name)}
                        </option>
                      ))}
                    </ThemedSelect>
                  </label>
                  <label>
                    Hospital admitted at
                    <input
                      required
                      aria-label="Hospital admitted at"
                      value={hospital}
                      onChange={(e) => setHospital(e.target.value)}
                      maxLength={200}
                    />
                  </label>
                  <label>
                    Doctor’s name
                    <input
                      required
                      aria-label="Doctor's name"
                      value={doctor}
                      onChange={(e) => setDoctor(e.target.value)}
                      maxLength={120}
                    />
                  </label>
                </div>
                <label>Number of units</label>
                <div className="bb-chips">
                  <button
                    type="button"
                    className="bb-btn"
                    aria-label="Decrease units"
                    disabled={quantity <= 1}
                    onClick={() => setQuantity((n) => n - 1)}
                  >
                    −
                  </button>
                  <output aria-label="Units" className="bb-btn">
                    {quantity}
                  </output>
                  <button
                    type="button"
                    className="bb-btn"
                    aria-label="Increase units"
                    disabled={quantity >= 10}
                    onClick={() => setQuantity((n) => n + 1)}
                  >
                    +
                  </button>
                </div>
                <h3>Needed by</h3>
                <div className="bb-fields">
                  <label>Date<input required type="date" min={new Date().toLocaleDateString("en-CA")} max={new Date(Date.now()+30*86400000).toLocaleDateString("en-CA")} value={planned} onChange={e=>setPlanned(e.target.value)}/></label>
                  <label>Time<input required type="time" value={plannedTime} onChange={e=>setPlannedTime(e.target.value)}/></label>
                </div>
                <h3>Urgency</h3>
                <div className="bb-chips">
                  {["Emergency", "Within 24 hours", "Planned"].map((u) => (
                    <label key={u} className="bb-radio">
                      <input
                        type="radio"
                        name="urgency"
                        checked={urgency === u}
                        onChange={() => setUrgency(u)}
                      />
                      {u}
                    </label>
                  ))}
                </div>
                {urgency === "Emergency" && (
                  <>
                    <p className="bb-info bb-note">
                      <span className="bb-note-icon" aria-hidden="true">
                        i
                      </span>
                      For emergency requests, the blood bank will contact you to
                      confirm availability. In a medical emergency, call 108 or
                      go to the nearest hospital.
                    </p>
                    <label>
                      Emergency reason
                      <input
                        required
                        minLength={5}
                        aria-label="Emergency reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        maxLength={300}
                      />
                    </label>
                  </>
                )}
                <h3>Upload doctor’s requisition form (required)</h3>
                <label className="bb-upload">
                  <FileUp size={20} /> Upload file (PDF, JPG, PNG – max 10 MB)
                  <input
                    type="file"
                    className="bb-file-input"
                    aria-label="Requisition file"
                    accept="application/pdf,image/jpeg,image/png"
                    disabled={busy || (who === "Family member" && !familyId)}
                    onChange={(e) => {
                      void upload(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
                {busy && <p role="status">Uploading…</p>}
                {requisition && (
                  <div
                    className="bb-requisition-file"
                    aria-label="Uploaded requisition"
                  >
                    <FileText aria-hidden="true" className="bb-file-icon" />
                    <div>
                      <span>{requisition.file_name}</span>
                      <small
                        className="bb-muted"
                        data-file-size={requisition.size_bytes}
                      >
                        {requisition.size_bytes < 1024
                          ? `${requisition.size_bytes} bytes`
                          : requisition.size_bytes < 1024 * 1024
                            ? `${(requisition.size_bytes / 1024).toLocaleString("en-IN", { maximumFractionDigits: 1 })} KB`
                            : `${(requisition.size_bytes / (1024 * 1024)).toLocaleString("en-IN", { maximumFractionDigits: 1 })} MB`}
                      </small>
                    </div>
                    <button
                      type="button"
                      className="bb-file-remove"
                      aria-label="Remove requisition"
                      onClick={() => setRequisition(null)}
                    >
                      &times;
                    </button>
                  </div>
                )}
                <p className="bb-info bb-note">
                  <span className="bb-note-icon" aria-hidden="true">
                    i
                  </span>
                  Some blood banks may ask for a replacement donor as per local
                  regulations. The blood bank will guide you after verification.
                </p>
              </section>
              <section className="bb-card bb-stack">
                <h2>Estimated processing charge</h2>
                {bank&&<p className="bb-muted">Based on {bank.name}&apos;s charges</p>}
                {quote ? (
                  <>
                    <div className="bb-row">
                      <span>
                        {componentLabel(component)} ({money(quote.per_unit)} ×{" "}
                        {quantity})
                      </span>
                      <b>{money(quote.total)}</b>
                    </div>
                    <div className="bb-row">
                      <span>Registration fee</span>
                      <span>
                        {quote.registration_fee === 0
                          ? "Not charged"
                          : money(quote.registration_fee)}
                      </span>
                    </div>
                    <div className="bb-row">
                      <h3>Total amount</h3>
                      <b>{money(quote.total)}</b>
                    </div>
                    <p className="bb-muted">{quote.fixed_when}</p>
                    <h3>Payment method</h3>
                    <div className="bb-chips">
                      {quote.payment_methods.map((m) => (
                        <label key={m.code} className="bb-radio">
                          <input
                            type="radio"
                            name="payment"
                            checked={preference === m.code}
                            onChange={() => setPreference(m.code)}
                          />
                          <span>
                            {m.label}
                            <small
                              className="bb-muted"
                              style={{ display: "block" }}
                            >
                              {m.when}
                            </small>
                          </span>
                        </label>
                      ))}
                    </div>
                  </>
                ) : (
                  <p role="status">Loading processing charges…</p>
                )}
              </section>
              <section className="bb-card bb-stack bb-what-next">
                <h2>What happens next?</h2>
                <ol>
                  <li><b>Centre accepts your request</b><small>The blood centre checks availability and confirms your request.</small></li>
                  <li><b>Cross-match and screening</b><small>The centre completes required safety and compatibility tests.</small></li>
                  <li><b>Ready for collection</b><small>You will be notified when the blood is ready.</small></li>
                  <li><b>Issued to you or the hospital</b><small>Collect from the centre following the hospital process.</small></li>
                </ol>
              </section>
              <p className="bb-muted">
                By submitting, you agree to the blood bank’s terms and
                conditions. Blood is issued after requisition verification and
                cross-matching.
              </p>
              <button
                className="bb-btn bb-primary"
                style={{ width: "100%" }}
                disabled={busy || !requisition || !quote || !bank}
              >
                Review request{" "}
                {quote?.total != null ? `· Approx. ${money(quote.total)}` : ""}{" "}
                →
              </button>
            </form>
          ) : (
            <section className="bb-card bb-stack">
              <h2>Review your request</h2>
              <p>
                <b>{name}</b> · {group} · {componentLabel(component)} ·{" "}
                {quantity} units
              </p>
              <p>
                {urgency} · {hospital} · {doctor}
              </p>
              <p>Requisition: {requisition?.file_name}</p>
              <p>
                Approximate processing charge:{" "}
                <b>{money(quote?.total ?? null)}</b>. Registration fee: Not
                charged.
              </p>
              <p>
                {
                  quote?.payment_methods.find((m) => m.code === preference)
                    ?.label
                }
                . {quote?.fixed_when}
              </p>
              <p className="bb-info">
                No payment is collected now. The blood bank must verify the
                requisition and cross-match blood before it is ready.
              </p>
              <div className="bb-actions">
                <button
                  className="bb-btn"
                  disabled={busy}
                  onClick={() => setStep(0)}
                >
                  Edit details
                </button>
                <button
                  className="bb-btn bb-primary"
                  disabled={busy}
                  onClick={submit}
                >
                  {busy ? "Submitting…" : "Submit request"}
                  {quote?.total != null
                    ? ` · Approx. ${money(quote.total)}`
                    : ""}
                </button>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
