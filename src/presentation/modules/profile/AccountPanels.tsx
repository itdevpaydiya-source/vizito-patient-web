import ThemedSelect from '../../components/forms/ThemedSelect';
﻿import { useEffect, useState, type FormEvent } from "react";
import { Bell, Lock } from "lucide-react";
import {
  devicesApi,
  revokeDeviceApi,
  deletionPreviewApi,
  deletionOtpApi,
  deletePatientAccountApi,
  downloadPatientDataApi,
  profileError,
  type PatientDevice,
  type DeletionPreview,
} from "../../../services/profileHelpHelper";
import {
  changePasswordApi,
  logoutOtherDevicesApi,
} from "../../../services/patientHelper";
import {
  PASSWORD_RULES,
  isStrongPassword,
  PASSWORD_POLICY_MESSAGE,
} from "../../../utils/passwordPolicy";
import { PhDialog, phDate } from "./ProfileUi";
export function NotificationCard() {
  return (
    <section
      className="ph-card ph-notification"
      aria-label="Notification preferences"
    >
      <div className="ph-card-header ph-title">
        <Bell />
        <h2>Notification preferences</h2>
      </div>
      <table className="ph-data">
        <thead>
          <tr>
            <th>Send via</th>
            <th>In-app</th>
          </tr>
        </thead>
        <tbody>
          {[
            "Appointments & reminders",
            "Lab test reports",
            "Prescriptions & pharmacy orders",
            "Payments & refunds",
            "Help & support",
          ].map((c) => (
            <tr key={c}>
              <td>{c}</td>
              <td>
                <span className="ph-badge">
                  <Lock
                    size={11}
                    style={{ display: "inline", marginRight: 4 }}
                  />
                  On · always on
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="ph-muted" style={{ marginTop: 12 }}>
        SMS and email alerts are coming soon.
      </p>
    </section>
  );
}
export function PasswordEditor({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [current, setCurrent] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const score = PASSWORD_RULES.filter((r) => r.test(password)).length;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isStrongPassword(password)) {
      setError(PASSWORD_POLICY_MESSAGE);
      return;
    }
    if (password !== confirm) {
      setError("New passwords must match.");
      return;
    }
    setBusy(true);
    try {
      await changePasswordApi(current, password);
      onSaved();
      onClose();
    } catch (e) {
      setError(profileError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <PhDialog title="Change password" onClose={onClose}>
      <form onSubmit={submit} className="ph-stack">
        <label>
          Current password
          <input
            required
            type="password"
            autoComplete="current-password"
            aria-label="Current password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </label>
        <label>
          New password
          <input
            required
            type="password"
            autoComplete="new-password"
            aria-label="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={100}
          />
        </label>
        <div
          className="ph-meter"
          role="meter"
          aria-label="Password strength"
          aria-valuemin={0}
          aria-valuemax={5}
          aria-valuenow={score}
        >
          <span style={{ width: `${score * 20}%` }} />
        </div>
        <ul className="ph-muted">
          {PASSWORD_RULES.map((r) => (
            <li key={r.label}>
              {r.test(password) ? "✓" : "○"} {r.label}
            </li>
          ))}
        </ul>
        <label>
          Confirm new password
          <input
            required
            type="password"
            autoComplete="new-password"
            aria-label="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>
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
            Change password
          </button>
        </div>
      </form>
    </PhDialog>
  );
}
export function DevicesDialog({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<PatientDevice[] | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState<string | null>(null);
  const load = async () => {
    try {
      setRows(await devicesApi());
      setError("");
    } catch (e) {
      setError(profileError(e));
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const revoke = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm === "others") await logoutOtherDevicesApi();
      else await revokeDeviceApi(confirm);
      setConfirm(null);
      await load();
    } catch (e) {
      setError(profileError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <PhDialog title="Logged-in devices" onClose={onClose}>
      <div className="ph-stack">
        {error && (
          <p role="alert" className="ph-error">
            {error}
            <button className="ph-btn" onClick={load}>
              Retry
            </button>
          </p>
        )}
        {!rows && !error ? (
          <p role="status">Loading devices…</p>
        ) : rows?.length ? (
          rows.map((d) => (
            <article className="ph-info" key={d.id}>
              <div className="ph-row">
                <b>{d.device || "Unknown device"}</b>
                {d.is_current ? (
                  <span className="ph-badge">This device</span>
                ) : (
                  <button className="ph-btn" onClick={() => setConfirm(d.id)}>
                    Log out
                  </button>
                )}
              </div>
              <p>
                Signed in {phDate(d.signed_in_at)}
                <br />
                Last active {phDate(d.last_active_at)}
              </p>
              {d.ip_address && <small>IP {d.ip_address}</small>}
            </article>
          ))
        ) : (
          rows && <p>No active devices found.</p>
        )}
        {rows && rows.filter((d) => !d.is_current).length > 0 && (
          <button
            className="ph-btn ph-danger"
            onClick={() => setConfirm("others")}
          >
            Log out all other devices
          </button>
        )}
        {confirm && (
          <div className="ph-error">
            <p>
              {confirm === "others"
                ? "Log out all other devices?"
                : "Log out this device?"}
            </p>
            <div className="ph-actions">
              <button className="ph-btn" onClick={() => setConfirm(null)}>
                Cancel
              </button>
              <button
                className="ph-btn ph-danger"
                disabled={busy}
                onClick={revoke}
              >
                Confirm log out
              </button>
            </div>
          </div>
        )}
      </div>
    </PhDialog>
  );
}
export function ExportDialog({ onClose }: { onClose: () => void }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false);
  const download = async () => {
    setBusy(true);
    setError("");
    try {
      await downloadPatientDataApi();
      setDone(true);
    } catch (e) {
      setError(profileError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <PhDialog title="Download my data" onClose={onClose}>
      <div className="ph-stack">
        <h3>What's included</h3>
        <ul className="ph-muted" style={{ listStyle: "disc", paddingLeft: 20 }}>
          {[
            "Your account and personal details",
            "Medical basics and emergency contact",
            "Saved addresses and family members",
            "Bookings across services, including family bookings",
            "Support tickets and signed-in devices",
          ].map((v) => (
            <li key={v}>{v}</li>
          ))}
        </ul>
        <p className="ph-info">
          Your data downloads instantly as a JSON file. Prescriptions and
          reports can be downloaded separately from Medical Records.
        </p>
        {done && (
          <p className="ph-success" role="status">
            Your data file has been downloaded.
          </p>
        )}
        {error && (
          <p role="alert" className="ph-error">
            {error}
          </p>
        )}
        <div className="ph-actions">
          <button className="ph-btn" onClick={onClose}>
            Close
          </button>
          <button
            className="ph-btn ph-primary"
            disabled={busy}
            onClick={download}
          >
            {busy ? "Preparing download…" : "Download my data"}
          </button>
        </div>
      </div>
    </PhDialog>
  );
}
const reasonLabels: Record<string, string> = {
  NOT_USING: "I no longer use Vizito",
  PRIVACY: "Privacy concerns",
  OTHER_APP: "I use another app",
  TOO_MANY_MESSAGES: "Too many messages",
  BAD_EXPERIENCE: "I had a bad experience",
  OTHER: "Other",
};
export function DeleteAccountDialog({ onClose }: { onClose: () => void }) {
  const [preview, setPreview] = useState<DeletionPreview | null>(null),
    [reason, setReason] = useState(""),
    [note, setNote] = useState(""),
    [confirm, setConfirm] = useState(""),
    [otp, setOtp] = useState(""),
    [sent, setSent] = useState<{ sent_to: string; dev_otp?: string } | null>(
      null,
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false);
  const load = async () => {
    try {
      setPreview(await deletionPreviewApi());
      setError("");
    } catch (e) {
      setError(profileError(e));
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!sent) setSent(await deletionOtpApi());
      else {
        await deletePatientAccountApi({
          otp,
          reason,
          note: note || undefined,
          confirm,
        });
        localStorage.removeItem("vizito_user");
        localStorage.removeItem("vizito_token");
        setDone(true);
        window.location.assign("/auth/login?closed=1");
      }
    } catch (e) {
      setError(profileError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <PhDialog title="Delete account" onClose={onClose}>
      {done ? (
        <p className="ph-success" role="status">
          Your account is closed. You are signed out everywhere.
        </p>
      ) : (
        <form onSubmit={submit} className="ph-stack">
          {!preview && !error && <p role="status">Checking account…</p>}
          {preview && (
            <>
              <ul
                className="ph-error"
                style={{ paddingLeft: 28, listStyle: "disc" }}
              >
                {preview.consequences.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              {!preview.can_delete ? (
                <section className="ph-info">
                  <h3>Account deletion is currently unavailable</h3>
                  <p>{preview.reason}</p>
                  <ul>
                    {preview.upcoming_bookings.map((b, i) => (
                      <li key={i}>
                        {String(
                          b.service_type || b.type || b.service || "Booking",
                        )}{" "}
                        ·{" "}
                        {String(
                          b.reference ||
                            b.booking_number ||
                            b.number ||
                            b.id ||
                            "",
                        )}{" "}
                        · {String(b.status || "Upcoming")}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : (
                <>
                  <label>
                    Reason
                    <ThemedSelect
                      required
                      aria-label="Reason for deleting account"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    >
                      <option value="">Choose a reason</option>
                      {preview.reasons.map((r) => (
                        <option key={r} value={r}>
                          {reasonLabels[r] || r}
                        </option>
                      ))}
                    </ThemedSelect>
                  </label>
                  <label>
                    Tell us more (optional)
                    <textarea
                      value={note}
                      maxLength={1000}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </label>
                  <label>
                    Type DELETE to confirm
                    <input
                      required
                      pattern="DELETE"
                      className="ph-confirm-input"
                      aria-label="Type DELETE to confirm"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="off"
                    />
                  </label>
                  {sent && (
                    <>
                      <p className="ph-info">
                        Enter the OTP sent to {sent.sent_to}.
                      </p>
                      <label>
                        Deletion OTP
                        <input
                          required
                          pattern="[0-9]{6}"
                          maxLength={6}
                          inputMode="numeric"
                          aria-label="Deletion OTP"
                          value={otp}
                          onChange={(e) =>
                            setOtp(e.target.value.replace(/\D/g, ""))
                          }
                        />
                      </label>
                      {sent.dev_otp && (
                        <p className="ph-muted">
                          Development test code:{" "}
                          <span data-dev-otp>{sent.dev_otp}</span>
                        </p>
                      )}
                    </>
                  )}
                </>
              )}
              {error && (
                <div className="ph-error" role="alert">
                  {error}
                  {!preview && (
                    <button type="button" className="ph-btn" onClick={load}>
                      Retry
                    </button>
                  )}
                </div>
              )}
              <div className="ph-actions">
                <button type="button" className="ph-btn" onClick={onClose}>
                  Cancel
                </button>
                {preview?.can_delete && (
                  <button
                    className="ph-btn ph-danger"
                    disabled={busy || !reason || confirm !== "DELETE"}
                  >
                    {busy
                      ? "Please wait…"
                      : sent
                        ? "Permanently close account"
                        : "Send deletion OTP"}
                  </button>
                )}
              </div>
            </>
          )}
          {!preview && error && (
            <p role="alert" className="ph-error">
              {error}
              <button type="button" className="ph-btn" onClick={load}>
                Retry
              </button>
            </p>
          )}
        </form>
      )}
    </PhDialog>
  );
}
