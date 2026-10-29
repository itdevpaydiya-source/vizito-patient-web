import ThemedSelect from '../../components/forms/ThemedSelect';
﻿import { useState, useEffect, type FormEvent } from "react";
import { Plus, X } from "lucide-react";
import api from "../../../services/index";
import {
  updateProfileApi,
  uploadPatientPhotoApi,
  sendContactOtpApi,
  verifyContactApi,
  type PatientProfileData,
} from "../../../services/patientHelper";
import {
  saveHealthProfileApi,
  BLOOD_GROUPS,
  COMMON_CONDITIONS,
  type HealthProfile,
  type HealthProfileInput,
  type ReportedMedication,
} from "../../../services/healthProfileHelper";
import { profileError } from "../../../services/profileHelpHelper";
import { PhDialog } from "./ProfileUi";
export const healthPayload = (h: HealthProfile): HealthProfileInput => ({
  blood_group: h.blood_group || "",
  height_cm: h.height_cm,
  weight_kg: h.weight_kg,
  allergies: h.allergies,
  no_known_allergies: h.no_known_allergies,
  conditions: h.conditions,
  medications: h.medications,
  emergency_contact_name: h.emergency_contact?.name || "",
  emergency_contact_phone: h.emergency_contact?.phone || "",
  emergency_contact_relation: h.emergency_contact?.relation || "",
});
type Common = { onClose: () => void; onSaved: () => Promise<void> };
export function PersonalEditor({
  profile,
  health,
  onClose,
  onSaved,
}: { profile: PatientProfileData; health: HealthProfile } & Common) {
  const [name, setName] = useState(profile.fullName || ""),
    [dob, setDob] = useState(profile.dateOfBirth || ""),
    [gender, setGender] = useState(profile.gender || ""),
    [blood, setBlood] = useState(health.blood_group || ""),
    [photo, setPhoto] = useState<File | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await updateProfileApi({
        fullName: name.trim(),
        dateOfBirth: dob,
        gender: gender || undefined,
      });
      if (blood !== (health.blood_group || ""))
        await saveHealthProfileApi({
          ...healthPayload(health),
          blood_group: blood,
        });
      if (photo) await uploadPatientPhotoApi(photo);
      await onSaved();
      onClose();
    } catch (e) {
      setError(profileError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <PhDialog title="Edit personal details" onClose={onClose}>
      <form onSubmit={submit} className="ph-stack">
        <label>
          Change photo
          <input
            type="file"
            aria-label="Change photo"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setPhoto(e.target.files?.[0] || null)}
          />
        </label>
        <label>
          Full name
          <input
            required
            minLength={2}
            maxLength={120}
            aria-label="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <div className="ph-grid">
          <label>
            Date of birth
            <input
              type="date"
              max={new Date().toLocaleDateString("en-CA")}
              aria-label="Date of birth"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </label>
          <label>
            Blood group
            <ThemedSelect
              aria-label="Blood group"
              value={blood}
              onChange={(e) => setBlood(e.target.value)}
            >
              <option value="">Not added</option>
              {BLOOD_GROUPS.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </ThemedSelect>
          </label>
          <label>
            Gender
            <ThemedSelect
              aria-label="Gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="">Not added</option>
              {["Male", "Female", "Other"].map((g) => (
                <option key={g}>{g}</option>
              ))}
            </ThemedSelect>
          </label>
        </div>
        {error && (
          <p role="alert" className="ph-error">
            {error}
          </p>
        )}
        <div className="ph-actions">
          <button type="button" className="ph-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="ph-btn ph-primary" disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </PhDialog>
  );
}
export function MedicalEditor({
  health,
  onClose,
  onSaved,
}: { health: HealthProfile } & Common) {
  const [f, setF] = useState(healthPayload(health)),
    [allergy, setAllergy] = useState(""),
    [condition, setCondition] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const patch = (v: Partial<HealthProfileInput>) =>
    setF((old) => ({ ...old, ...v }));
  const addAllergy = () => {
    if (allergy.trim().length < 2) return;
    patch({
      allergies: [...f.allergies, { allergen: allergy.trim() }],
      no_known_allergies: false,
    });
    setAllergy("");
  };
  const addCondition = () => {
    if (condition.trim().length < 2) return;
    patch({
      conditions: Array.from(new Set([...f.conditions, condition.trim()])),
    });
    setCondition("");
  };
  const medicine = (index: number, value: Partial<ReportedMedication>) =>
    patch({
      medications: f.medications.map((m, i) =>
        i === index ? { ...m, ...value } : m,
      ),
    });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (f.medications.some((m) => m.name.trim().length < 2))
        throw Error("Enter a name for each medicine.");
      await saveHealthProfileApi(f);
      await onSaved();
      onClose();
    } catch (e) {
      setError(profileError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <PhDialog title="Edit medical basics" onClose={onClose}>
      <form onSubmit={submit} className="ph-stack">
        <div className="ph-grid">
          <label>
            Height (cm)
            <input
              type="number"
              min={30}
              max={250}
              aria-label="Height (cm)"
              value={f.height_cm ?? ""}
              onChange={(e) =>
                patch({
                  height_cm: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </label>
          <label>
            Weight (kg)
            <input
              type="number"
              min={1}
              max={300}
              step="0.1"
              aria-label="Weight (kg)"
              value={f.weight_kg ?? ""}
              onChange={(e) =>
                patch({
                  weight_kg: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </label>
          <label>
            Blood group
            <ThemedSelect
              aria-label="Blood group"
              value={f.blood_group}
              onChange={(e) => patch({ blood_group: e.target.value })}
            >
              <option value="">Not added</option>
              {BLOOD_GROUPS.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </ThemedSelect>
          </label>
        </div>
        <h3>Allergies</h3>
        <div className="ph-pill-list">
          {f.allergies.map((a, i) => (
            <span className="ph-chip" key={i}>
              {a.allergen}
              <button
                type="button"
                aria-label={`Remove allergy ${a.allergen}`}
                onClick={() =>
                  patch({ allergies: f.allergies.filter((_, n) => n !== i) })
                }
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        <label>
          <input
            type="checkbox"
            checked={f.no_known_allergies}
            onChange={(e) =>
              patch({
                no_known_allergies: e.target.checked,
                allergies: e.target.checked ? [] : f.allergies,
              })
            }
          />
          No known allergies
        </label>
        <div className="ph-row">
          <label style={{ flex: 1 }}>
            Add allergy
            <input
              aria-label="Add allergy"
              value={allergy}
              onChange={(e) => setAllergy(e.target.value)}
              maxLength={80}
            />
          </label>
          <button type="button" className="ph-btn" onClick={addAllergy}>
            Add allergy
          </button>
        </div>
        <h3>Chronic conditions</h3>
        <div className="ph-pill-list">
          {f.conditions.map((c) => (
            <span className="ph-chip" key={c}>
              {c}
              <button
                type="button"
                aria-label={`Remove condition ${c}`}
                onClick={() =>
                  patch({ conditions: f.conditions.filter((v) => v !== c) })
                }
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        <label>
          Add condition
          <input
            aria-label="Add condition"
            list="ph-condition-options"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            maxLength={80}
          />
          <datalist id="ph-condition-options">
            {COMMON_CONDITIONS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </datalist>
        </label>
        <button type="button" className="ph-btn" onClick={addCondition}>
          Add condition
        </button>
        <h3>Current medicines</h3>
        {f.medications.map((m, i) => (
          <div className="ph-grid ph-info" key={i}>
            <label>
              Medicine name
              <input
                required
                minLength={2}
                aria-label={`Medicine name ${i + 1}`}
                value={m.name}
                maxLength={100}
                onChange={(e) => medicine(i, { name: e.target.value })}
              />
            </label>
            <label>
              Dose
              <input
                aria-label={`Dose ${i + 1}`}
                value={m.dose || ""}
                maxLength={80}
                onChange={(e) => medicine(i, { dose: e.target.value })}
              />
            </label>
            <label>
              Frequency
              <input
                aria-label={`Frequency ${i + 1}`}
                value={m.frequency || ""}
                maxLength={60}
                onChange={(e) => medicine(i, { frequency: e.target.value })}
              />
            </label>
            <button
              type="button"
              className="ph-link"
              onClick={() =>
                patch({ medications: f.medications.filter((_, n) => n !== i) })
              }
            >
              Remove medicine
            </button>
          </div>
        ))}
        <button
          type="button"
          className="ph-btn"
          onClick={() =>
            patch({
              medications: [
                ...f.medications,
                { name: "", dose: "", frequency: "" },
              ],
            })
          }
        >
          <Plus />
          Add medicine
        </button>
        {error && (
          <p role="alert" className="ph-error">
            {error}
          </p>
        )}
        <div className="ph-actions">
          <button type="button" className="ph-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="ph-btn ph-primary" disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </PhDialog>
  );
}
export function EmergencyEditor({
  health,
  userId,
  onClose,
  onSaved,
}: { health: HealthProfile; userId: number } & Common) {
  const [mode, setMode] = useState("family"),
    [members, setMembers] = useState<
      {
        member_user_id: number;
        full_name: string;
        relationship: string;
        phone: string | null;
      }[]
    >([]),
    [name, setName] = useState(health.emergency_contact?.name || ""),
    [phone, setPhone] = useState(health.emergency_contact?.phone || ""),
    [relation, setRelation] = useState(
      health.emergency_contact?.relation || "",
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    api
      .get(`/users/${userId}/family-members/overview`)
      .then((r) => setMembers(r.data))
      .catch((e) => setError(profileError(e)));
  }, [userId]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await saveHealthProfileApi({
        ...healthPayload(health),
        emergency_contact_name: name,
        emergency_contact_phone: phone,
        emergency_contact_relation: relation,
      });
      await onSaved();
      onClose();
    } catch (e) {
      setError(profileError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <PhDialog title="Edit emergency contact" onClose={onClose}>
      <form onSubmit={submit} className="ph-stack">
        <div className="ph-tabs" role="tablist">
          {["family", "new"].map((m) => (
            <button
              type="button"
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
            >
              {m === "family" ? "Select family member" : "Add new contact"}
            </button>
          ))}
        </div>
        {mode === "family" && (
          <div className="ph-stack">
            {members.length ? (
              members.map((m) => (
                <label className="ph-info" key={m.member_user_id}>
                  <input
                    type="radio"
                    name="emergency-member"
                    checked={name === m.full_name}
                    onChange={() => {
                      setName(m.full_name);
                      setPhone(m.phone || "");
                      setRelation(m.relationship);
                    }}
                  />
                  {m.full_name} ({m.relationship})<br />
                  <small>{m.phone || "Add a contact phone below"}</small>
                </label>
              ))
            ) : (
              <p className="ph-muted">
                No linked family members. Add a new contact instead.
              </p>
            )}
          </div>
        )}
        <label>
          Name
          <input
            required
            aria-label="Emergency contact name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
          />
        </label>
        <div className="ph-grid">
          <label>
            Relation
            <input
              required
              aria-label="Emergency contact relation"
              value={relation}
              onChange={(e) => setRelation(e.target.value)}
              maxLength={40}
            />
          </label>
          <label>
            Phone number
            <input
              required
              pattern="[6-9][0-9]{9}"
              aria-label="Emergency contact phone"
              inputMode="tel"
              value={phone}
              onChange={(e) =>
                setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
              }
            />
          </label>
        </div>
        {error && (
          <p className="ph-error" role="alert">
            {error}
          </p>
        )}
        <div className="ph-actions">
          <button type="button" className="ph-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="ph-btn ph-primary" disabled={busy}>
            Save contact
          </button>
        </div>
      </form>
    </PhDialog>
  );
}
export function ContactEditor({
  which,
  onClose,
  onSaved,
}: { which: "phone" | "email" } & Common) {
  const [value, setValue] = useState(""),
    [sent, setSent] = useState(false),
    [otp, setOtp] = useState(""),
    [dev, setDev] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [complete, setComplete] = useState(false),
    [resendAt, setResendAt] = useState(0),
    [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const send = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await sendContactOtpApi({ [which]: value });
      setSent(true);
      setDev(r.dev_otp || "");
      setResendAt(Date.now() + 30000);
    } catch (e) {
      setError(profileError(e));
    } finally {
      setBusy(false);
    }
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!sent) {
      await send();
      return;
    }
    setBusy(true);
    setError("");
    try {
      await verifyContactApi({ [which]: value, otp });
      await onSaved();
      setComplete(true);
    } catch (e) {
      setError(profileError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <PhDialog
      title={`Change ${which === "phone" ? "mobile number" : "email"}`}
      onClose={onClose}
    >
      <ol className="ph-row ph-muted" aria-label="Contact verification steps">
        <li>1 Enter {which === "phone" ? "number" : "email"}</li>
        <li>2 Verify OTP</li>
        <li>3 Complete</li>
      </ol>
      {complete ? (
        <div className="ph-success" role="status">
          Your {which === "phone" ? "mobile number" : "email"} has been updated
          and verified.
          <button className="ph-btn" onClick={onClose}>
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="ph-stack">
          {!sent ? (
            <label>
              New {which === "phone" ? "mobile number" : "email"}
              <input
                required
                type={which === "email" ? "email" : "tel"}
                pattern={which === "phone" ? "[6-9][0-9]{9}" : undefined}
                aria-label={`New ${which === "phone" ? "mobile number" : "email"}`}
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </label>
          ) : (
            <>
              <p className="ph-muted">We sent a 6-digit OTP to {value}.</p>
              <label>
                Verification code
                <input
                  className="ph-code"
                  required
                  pattern="[0-9]{6}"
                  maxLength={6}
                  inputMode="numeric"
                  aria-label="Verification code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                />
              </label>
              {dev && (
                <p className="ph-muted">
                  Development test code: <span data-dev-otp>{dev}</span>
                </p>
              )}
              <button
                type="button"
                className="ph-link"
                disabled={busy || now < resendAt}
                onClick={send}
              >
                {now < resendAt
                  ? `Resend OTP in ${Math.ceil((resendAt - now) / 1000)}s`
                  : "Resend OTP"}
              </button>
            </>
          )}
          {error && (
            <p role="alert" className="ph-error">
              {error}
            </p>
          )}
          <div className="ph-actions">
            <button type="button" className="ph-btn" onClick={onClose}>
              Cancel
            </button>
            <button className="ph-btn ph-primary" disabled={busy}>
              {busy ? "Please wait…" : sent ? "Verify & continue" : "Send OTP"}
            </button>
          </div>
        </form>
      )}
    </PhDialog>
  );
}
