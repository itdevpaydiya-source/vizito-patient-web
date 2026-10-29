import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  UserRound,
  ShieldCheck,
  HeartPulse,
  ContactRound,
  LockKeyhole,
  Database,
  LogOut,
  Pencil,
} from "lucide-react";
import MediaImage from "../../components/MediaImage";
import {
  getPatientProfileApi,
  getAddressesApi,
  photoUrl,
  type PatientProfileData,
  type PatientAddress,
} from "../../../services/patientHelper";
import {
  getHealthProfileApi,
  type HealthProfile,
} from "../../../services/healthProfileHelper";
import {
  contactVerificationApi,
  profileError,
} from "../../../services/profileHelpHelper";
import {
  PersonalEditor,
  MedicalEditor,
  EmergencyEditor,
  ContactEditor,
} from "./ProfileEditors";
import {
  NotificationCard,
  PasswordEditor,
  DevicesDialog,
  ExportDialog,
  DeleteAccountDialog,
} from "./AccountPanels";
import AddressBook from "./AddressBook";
import { PhDialog, showValue } from "./ProfileUi";
import "./profileHelp.css";
export default function ProfileLayout() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [profile, setProfile] = useState<PatientProfileData | null>(null),
    [health, setHealth] = useState<HealthProfile | null>(null),
    [addresses, setAddresses] = useState<PatientAddress[]>([]),
    [verified, setVerified] = useState({
      phoneVerified: false,
      emailVerified: false,
    }),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(true),
    [editor, setEditor] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const [p, h, a, v] = await Promise.all([
        getPatientProfileApi(),
        getHealthProfileApi(),
        getAddressesApi(),
        contactVerificationApi(),
      ]);
      if (!p) throw Error("Could not load your profile.");
      setProfile(p);
      setHealth(h);
      setAddresses(a);
      setVerified({
        phoneVerified: !!v.phoneVerified,
        emailVerified: !!v.emailVerified,
      });
      setError("");
      const raw = localStorage.getItem("vizito_user");
      if (raw)
        localStorage.setItem(
          "vizito_user",
          JSON.stringify({
            ...JSON.parse(raw),
            fullName: p.fullName,
            mobile: p.phone,
            email: p.email,
          }),
        );
    } catch (e) {
      setError(profileError(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const section = params.get("section");
    if (section)
      document
        .getElementById(`ph-${section}`)
        ?.scrollIntoView({ behavior: "smooth" });
  }, [params, loading]);
  const saved = async () => {
    await load();
    setNotice("Your changes have been saved.");
  };
  const close = () => setEditor(null);
  const edit = (name: string) => {
    setNotice("");
    setEditor(name);
  };
  const header = (title: string, Icon: typeof UserRound, action?: string) => (
    <div className="ph-card-header ph-row">
      <div className="ph-title">
        <Icon />
        <h2>{title}</h2>
      </div>
      {action && (
        <button
          className="ph-btn"
          aria-label={`Edit ${title.toLowerCase()}`}
          onClick={() => edit(action)}
        >
          <Pencil />
          Edit
        </button>
      )}
    </div>
  );
  return (
    <div className="ph-page ph-stack">
      <header>
        <h1 className="ph-title">
          <UserRound />
          Profile & settings
        </h1>
        <p className="ph-sub">
          Manage your personal details, medical information, addresses,
          notifications and more.
        </p>
      </header>
      {notice && (
        <p className="ph-success" role="status">
          {notice}
        </p>
      )}
      {loading && <p role="status">Loading profile…</p>}
      {error && (
        <div className="ph-error" role="alert">
          {error}
          <button
            className="ph-btn"
            onClick={() => {
              setLoading(true);
              void load();
            }}
          >
            Retry
          </button>
        </div>
      )}
      {profile && health && (
        <>
          <section className="ph-card" aria-label="Personal details">
            {header("Personal details", ShieldCheck, "personal")}
            <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
              <MediaImage
                kind="professional"
                name={profile.fullName || "Your profile"}
                src={photoUrl(profile.profilePicture)}
                className="ph-avatar"
              />
              <dl className="ph-facts" style={{ flex: 1 }}>
                <div>
                  <dt>Full name</dt>
                  <dd>{showValue(profile.fullName)}</dd>
                </div>
                <div>
                  <dt>Date of birth</dt>
                  <dd>
                    {profile.dateOfBirth
                      ? new Date(
                          profile.dateOfBirth + "T00:00:00",
                        ).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "Not added"}
                  </dd>
                </div>
                <div>
                  <dt>Email address</dt>
                  <dd>
                    {showValue(profile.email)}{" "}
                    {verified.emailVerified && (
                      <span className="ph-badge">Verified</span>
                    )}
                    <br />
                    <button className="ph-link" onClick={() => edit("email")}>
                      Change email
                    </button>
                  </dd>
                </div>
                <div>
                  <dt>Gender</dt>
                  <dd>{showValue(profile.gender)}</dd>
                </div>
                <div>
                  <dt>Blood group</dt>
                  <dd>{showValue(health.blood_group)}</dd>
                </div>
                <div>
                  <dt>Mobile number</dt>
                  <dd>
                    {showValue(profile.phone)}{" "}
                    {verified.phoneVerified && (
                      <span className="ph-badge">Verified</span>
                    )}
                    <br />
                    <button className="ph-link" onClick={() => edit("phone")}>
                      Change mobile number
                    </button>
                  </dd>
                </div>
              </dl>
            </div>
          </section>
          <section
            id="ph-health"
            className="ph-card ph-stack"
            aria-label="Medical basics"
          >
            {header("Medical basics", HeartPulse, "medical")}
            <dl className="ph-facts">
              <div>
                <dt>Height</dt>
                <dd>
                  {health.height_cm ? `${health.height_cm} cm` : "Not added"}
                </dd>
              </div>
              <div>
                <dt>Weight</dt>
                <dd>
                  {health.weight_kg ? `${health.weight_kg} kg` : "Not added"}
                </dd>
              </div>
              <div>
                <dt>Blood group</dt>
                <dd>{showValue(health.blood_group)}</dd>
              </div>
            </dl>
            {[
              [
                "Allergies",
                health.allergies.map((a) => a.allergen).join(", ") ||
                  (health.no_known_allergies
                    ? "No known allergies"
                    : "No allergies added"),
              ],
              [
                "Chronic conditions",
                health.conditions.join(", ") || "No conditions added",
              ],
              [
                "Current medicines",
                health.medications
                  .map((m) =>
                    [m.name, m.dose, m.frequency].filter(Boolean).join(" · "),
                  )
                  .join("; ") || "No current medicines added",
              ],
            ].map(([title, value]) => (
              <div className="ph-health-line" key={title}>
                <div className="ph-row">
                  <h3>{title}</h3>
                  <button className="ph-link" onClick={() => edit("medical")}>
                    {value.startsWith("No ") ? "Add" : "Edit"}
                  </button>
                </div>
                <p className="ph-muted">{value}</p>
              </div>
            ))}
          </section>
          <section className="ph-card" aria-label="Emergency contact">
            {header("Emergency contact", ContactRound, "emergency")}
            <dl className="ph-facts">
              <div>
                <dt>Name</dt>
                <dd>{showValue(health.emergency_contact?.name)}</dd>
              </div>
              <div>
                <dt>Phone number</dt>
                <dd>{showValue(health.emergency_contact?.phone)}</dd>
              </div>
              <div>
                <dt>Relation</dt>
                <dd>{showValue(health.emergency_contact?.relation)}</dd>
              </div>
            </dl>
          </section>
          <div id="ph-addresses" className="ph-address-wrapper">
            <AddressBook
              addresses={addresses}
              me={{ name: profile.fullName || "", phone: profile.phone || "" }}
              onChanged={load}
              toast={setNotice}
            />
          </div>
          <div id="ph-notifications">
            <NotificationCard />
          </div>
          <div className="ph-grid">
            <section className="ph-card">
              <div className="ph-card-header ph-title">
                <LockKeyhole />
                <h2>Security</h2>
              </div>
              <div className="ph-security">
                <button className="ph-link" onClick={() => edit("password")}>
                  Change password <span style={{ float: "right" }}>›</span>
                </button>
                <button className="ph-link" onClick={() => edit("devices")}>
                  Logged-in devices <span style={{ float: "right" }}>›</span>
                </button>
              </div>
            </section>
            <section className="ph-card">
              <div className="ph-card-header ph-title">
                <Database />
                <h2>Privacy & data</h2>
              </div>
              <div className="ph-security">
                <button className="ph-link" onClick={() => edit("export")}>
                  Download my data <span style={{ float: "right" }}>›</span>
                </button>
                <button
                  className="ph-link"
                  style={{ color: "#e32a43" }}
                  onClick={() => edit("delete")}
                >
                  Delete account <span style={{ float: "right" }}>›</span>
                </button>
              </div>
            </section>
          </div>
          <div className="ph-row">
            <Link className="ph-link" to="/family-profiles">
              Manage family members
            </Link>
            <button className="ph-btn" onClick={() => edit("logout")}>
              <LogOut />
              Log out
            </button>
          </div>
          {editor === "personal" && (
            <PersonalEditor
              profile={profile}
              health={health}
              onClose={close}
              onSaved={saved}
            />
          )}
          {editor === "medical" && (
            <MedicalEditor health={health} onClose={close} onSaved={saved} />
          )}
          {editor === "emergency" && (
            <EmergencyEditor
              health={health}
              userId={profile.userId}
              onClose={close}
              onSaved={saved}
            />
          )}
          {(editor === "phone" || editor === "email") && (
            <ContactEditor which={editor} onClose={close} onSaved={saved} />
          )}
          {editor === "password" && (
            <PasswordEditor
              onClose={close}
              onSaved={() => setNotice("Password changed.")}
            />
          )}
          {editor === "devices" && <DevicesDialog onClose={close} />}
          {editor === "export" && <ExportDialog onClose={close} />}
          {editor === "delete" && <DeleteAccountDialog onClose={close} />}
          {editor === "logout" && (
            <PhDialog title="Log out" onClose={close}>
              <p>
                Log out of this device? You can sign in again to access your
                bookings and records.
              </p>
              <div className="ph-actions">
                <button className="ph-btn" onClick={close}>
                  Cancel
                </button>
                <button
                  className="ph-btn ph-primary"
                  onClick={async () => {
                    try {
                      const { default: api } =
                        await import("../../../services/index");
                      await api.post("/patient/auth/logout");
                      localStorage.removeItem("vizito_user");
                      localStorage.removeItem("vizito_token");
                      navigate("/auth/login");
                    } catch (e) {
                      setError(profileError(e));
                      close();
                    }
                  }}
                >
                  Log out
                </button>
              </div>
            </PhDialog>
          )}
        </>
      )}
    </div>
  );
}
