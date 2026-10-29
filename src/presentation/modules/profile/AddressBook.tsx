import ThemedSelect from '../../components/forms/ThemedSelect';
import React, { useState } from "react";
import { PhDialog } from "./ProfileUi";
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Home,
  Briefcase,
  Star,
  Phone,
  X,
} from "lucide-react";
import MapPinPicker, {
  type PinAddress,
} from "../../components/location/MapPinPicker";
import {
  saveAddressApi,
  deleteAddressApi,
  setDefaultAddressApi,
  type PatientAddress,
  type AddressInput,
} from "../../../services/patientHelper";
import {
  validatePinCode,
  validateMobile,
  validatePersonName,
} from "../../../utils/validators/india";

// Saved addresses: where the lab collects samples, home care visits and medicines are delivered.
// Add, edit, set default, delete. Each address carries who to call on arrival.
export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

type Kind = "HOME" | "WORK" | "OTHER";
const KIND: Record<Kind, { label: string; icon: React.ElementType }> = {
  HOME: { label: "Home", icon: Home },
  WORK: { label: "Work", icon: Briefcase },
  OTHER: { label: "Other", icon: MapPin },
};
const empty = (who: { name: string; phone: string }, first: boolean) => ({
  pin: null as { lat: number; lng: number } | null,
  kind: "HOME" as Kind,
  label: "",
  line1: "",
  line2: "",
  landmark: "",
  pincode: "",
  city: "",
  state: "",
  contactName: who.name,
  contactPhone: who.phone,
  isDefault: first,
});
const field =
  "w-full min-w-0 p-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-shadow";

export default function AddressBook({
  addresses,
  me,
  onChanged,
  toast,
}: {
  addresses: PatientAddress[];
  me: { name: string; phone: string };
  onChanged: () => Promise<void> | void;
  toast: (m: string) => void;
}) {
  const [form, setForm] = useState<ReturnType<typeof empty> | null>(null);
  const [mapPin, setMapPin] = useState<{ lat: number; lng: number } | null>(
    null,
  ); // the pin on the map now
  const [editId, setEditId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState<PatientAddress | null>(null);

  // The address found at the pin replaces the street, city, state and PIN code (house number stays).
  const fillFrom = (a: PinAddress) => {
    const st = INDIAN_STATES.find(
      (x) => x.toLowerCase() === a.state.toLowerCase(),
    );
    setForm((f) =>
      f
        ? {
            ...f,
            line2: [a.line1, a.area].filter(Boolean).join(", ") || f.line2,
            city: a.city || f.city,
            state: st || f.state,
            pincode: a.pincode || f.pincode,
          }
        : f,
    );
  };

  const open = (a?: PatientAddress) => {
    setErrors({});
    setMapPin(null);
    if (!a) {
      setEditId(null);
      setForm(empty(me, addresses.length === 0));
      return;
    }
    setEditId(a.addressId);
    setForm({
      pin: a.pin || null,
      kind: (["HOME", "WORK", "OTHER"].includes(String(a.addressType))
        ? a.addressType
        : "OTHER") as Kind,
      label: a.label || "",
      line1: a.addressLine1 || "",
      line2: a.addressLine2 || "",
      landmark: a.landmark || "",
      pincode: a.pincode || "",
      city: a.city || "",
      state: a.state || "",
      contactName: a.contactName || me.name,
      contactPhone: a.contactPhone || me.phone,
      isDefault: a.isDefault,
    });
  };

  const validate = (f: NonNullable<typeof form>) => {
    const e: Record<string, string> = {};
    if (f.line1.trim().length < 3)
      e.line1 = "Enter the house / flat number and building.";
    if (f.line2.trim().length < 3) e.line2 = "Enter the street or area.";
    const pin = validatePinCode(f.pincode);
    if (!pin.ok) e.pincode = pin.message;
    if (f.city.trim().length < 2) e.city = "Enter the city.";
    if (!f.state) e.state = "Choose the state.";
    if (f.contactPhone) {
      const mob = validateMobile(f.contactPhone);
      if (!mob.ok) e.contactPhone = mob.message;
    }
    if (f.contactName) {
      const name = validatePersonName(f.contactName, { required: false });
      if (!name.ok) e.contactName = name.message;
    }
    if (f.kind === "OTHER" && !f.label.trim())
      e.label = 'Name this address, e.g. "Parents’ home".';
    return e;
  };

  const save = async () => {
    if (!form) return;
    const e = validate(form);
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const body: AddressInput = {
      address_type: form.kind,
      label: form.kind === "OTHER" ? form.label.trim() : KIND[form.kind].label,
      address_line_1: form.line1.trim(),
      address_line_2: form.line2.trim(),
      landmark: form.landmark.trim() || undefined,
      pincode: form.pincode,
      city: form.city.trim(),
      state: form.state,
      contact_name: form.contactName.trim() || undefined,
      contact_phone:
        form.contactPhone.replace(/\D/g, "").slice(-10) || undefined,
      is_default: form.isDefault,
      ...(mapPin || form.pin
        ? {
            latitude: (mapPin || form.pin)!.lat,
            longitude: (mapPin || form.pin)!.lng,
          }
        : {}),
    };
    try {
      await saveAddressApi(body, editId || undefined);
      if (editId && form.isDefault) await setDefaultAddressApi(editId);
      await onChanged();
      toast(editId ? "Address updated." : "Address saved.");
      setForm(null);
    } catch (err: any) {
      const m = err?.response?.data?.message;
      setErrors({
        server: Array.isArray(m)
          ? m.join(" ")
          : m || "Could not save the address.",
      });
    } finally {
      setBusy(false);
    }
  };

  const err = (k: string) =>
    errors[k] ? (
      <p className="text-[11px] font-semibold text-rose-600 mt-1">
        {errors[k]}
      </p>
    ) : null;
  const set = (patch: Partial<NonNullable<typeof form>>) =>
    setForm((f) => (f ? { ...f, ...patch } : f));

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 space-y-5 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50">
              <MapPin className="w-4 h-4 text-brand-700" />
            </span>{" "}
            Saved addresses
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Used for lab sample collection at home, home care visits and
            medicine delivery. The default is filled in for you.
          </p>
        </div>
        {!form && (
          <button onClick={() => open()} className="ph-btn ph-primary">
            <Plus className="w-4 h-4" /> Add address
          </button>
        )}
      </div>

      {form && (
        <PhDialog
          title={editId ? "Edit address" : "Add address"}
          onClose={() => setForm(null)}
        >
          <section
            aria-label={editId ? "Edit address" : "New address"}
            className="rounded-2xl border border-brand-200 bg-brand-50/35 p-4 sm:p-5 space-y-4"
          >
            <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
              <p className="text-xs font-bold text-slate-800">
                Pin this address on the map
              </p>
              <p className="text-[11px] text-slate-500">
                At this address now? Tap “I’m here now”. Otherwise search, or
                tap and drag the pin onto the door. The address found at the pin
                can fill the form.
              </p>
              <MapPinPicker
                key={editId || "new"}
                value={form.pin}
                placeName="this address"
                hint="Lab collectors, nurses and delivery staff use this pin to reach your door."
                address={[form.line1, form.line2, form.city, form.pincode]
                  .filter(Boolean)
                  .join(", ")}
                onChange={(p) => set({ pin: p })}
                onDraft={setMapPin}
                onUseAddress={fillFrom}
              />
            </div>
            <div
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-label="Address type"
            >
              {(Object.keys(KIND) as Kind[]).map((k) => {
                const I = KIND[k].icon;
                return (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={form.kind === k}
                    onClick={() => set({ kind: k })}
                    className={`px-3 py-1.5 rounded-full border text-xs font-bold inline-flex items-center gap-1 ${form.kind === k ? "bg-teal-700 border-teal-700 text-white" : "bg-white border-slate-200 text-slate-600"}`}
                  >
                    <I className="w-3.5 h-3.5" /> {KIND[k].label}
                  </button>
                );
              })}
            </div>
            {form.kind === "OTHER" && (
              <div>
                <label className="text-[11px] font-bold text-slate-600">
                  Name for this address
                </label>
                <input
                  className={field}
                  aria-label="Address label"
                  value={form.label}
                  onChange={(e) => set({ label: e.target.value })}
                  placeholder="e.g. Parents’ home"
                  maxLength={60}
                />
                {err("label")}
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600">
                  House / flat no., building
                </label>
                <input
                  className={field}
                  aria-label="House / flat no., building"
                  value={form.line1}
                  onChange={(e) => set({ line1: e.target.value })}
                  placeholder="e.g. Flat 302, Sai Residency"
                  maxLength={200}
                />
                {err("line1")}
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600">
                  Street / area
                </label>
                <input
                  className={field}
                  aria-label="Street / area"
                  value={form.line2}
                  onChange={(e) => set({ line2: e.target.value })}
                  placeholder="e.g. Road No. 12, Banjara Hills"
                  maxLength={200}
                />
                {err("line2")}
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600">
                  Landmark (optional)
                </label>
                <input
                  className={field}
                  aria-label="Landmark"
                  value={form.landmark}
                  onChange={(e) => set({ landmark: e.target.value })}
                  placeholder="e.g. Opposite City Hospital"
                  maxLength={100}
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600">
                  PIN code
                </label>
                <input
                  className={field}
                  inputMode="numeric"
                  maxLength={6}
                  aria-label="PIN code"
                  value={form.pincode}
                  onChange={(e) =>
                    set({
                      pincode: e.target.value.replace(/\D/g, "").slice(0, 6),
                    })
                  }
                  onBlur={() => {
                    if (form.pincode) {
                      const p = validatePinCode(form.pincode);
                      setErrors((prev) => ({
                        ...prev,
                        pincode: p.ok ? "" : p.message,
                      }));
                    }
                  }}
                  placeholder="6 digits"
                />
                {err("pincode")}
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600">
                  City
                </label>
                <input
                  className={field}
                  aria-label="City"
                  value={form.city}
                  onChange={(e) => set({ city: e.target.value })}
                  placeholder="e.g. Hyderabad"
                  maxLength={100}
                />
                {err("city")}
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600">
                  State
                </label>
                <ThemedSelect
                  className={field}
                  aria-label="State"
                  value={form.state}
                  onChange={(e) => set({ state: e.target.value })}
                >
                  <option value="">Choose state…</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </ThemedSelect>
                {err("state")}
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600">
                  Person to call on arrival
                </label>
                <input
                  className={field}
                  aria-label="Person to call on arrival"
                  value={form.contactName}
                  onChange={(e) => set({ contactName: e.target.value })}
                  onBlur={() => {
                    if (form.contactName) {
                      const n = validatePersonName(form.contactName, {
                        required: false,
                      });
                      setErrors((prev) => ({
                        ...prev,
                        contactName: n.ok ? "" : n.message,
                      }));
                    }
                  }}
                  maxLength={100}
                />
                {err("contactName")}
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600">
                  Their mobile number
                </label>
                <input
                  className={field}
                  inputMode="tel"
                  aria-label="Their mobile number"
                  value={form.contactPhone}
                  onChange={(e) =>
                    set({
                      contactPhone: e.target.value
                        .replace(/[^\d+ ]/g, "")
                        .slice(0, 14),
                    })
                  }
                  onBlur={() => {
                    if (form.contactPhone) {
                      const m = validateMobile(form.contactPhone);
                      setErrors((prev) => ({
                        ...prev,
                        contactPhone: m.ok ? "" : m.message,
                      }));
                    }
                  }}
                />
                {err("contactPhone")}
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => set({ isDefault: e.target.checked })}
              />{" "}
              Use as my default address
            </label>
            {errors.server && (
              <p role="alert" className="ph-error">
                {errors.server}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setForm(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                disabled={busy}
                onClick={save}
                className="ph-btn ph-primary"
              >
                {busy ? "Saving…" : editId ? "Save changes" : "Save address"}
              </button>
            </div>
          </section>
        </PhDialog>
      )}

      {addresses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...addresses]
            .sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
            .map((a) => {
              const k = (
                ["HOME", "WORK", "OTHER"].includes(String(a.addressType))
                  ? a.addressType
                  : "OTHER"
              ) as Kind;
              const I = KIND[k].icon;
              return (
                <div
                  data-address-id={a.addressId}
                  data-default={a.isDefault}
                  key={a.addressId}
                  className={`p-4 sm:p-5 rounded-2xl border space-y-3 transition-all hover:shadow-sm ${a.isDefault ? "border-brand-300 bg-brand-50/45 ring-1 ring-brand-600/10" : "border-slate-200 bg-white hover:border-brand-200"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-slate-900 text-sm inline-flex items-center gap-1.5">
                      <I className="w-4 h-4 text-teal-700" />{" "}
                      {a.label || KIND[k].label}
                    </span>
                    {a.isDefault && (
                      <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {[a.addressLine1, a.addressLine2]
                      .filter(Boolean)
                      .join(", ")}
                    {a.landmark ? (
                      <>
                        <br />
                        <span className="text-slate-500">
                          Near {a.landmark}
                        </span>
                      </>
                    ) : null}
                    <br />
                    {[a.city, a.state].filter(Boolean).join(", ")}
                    {a.pincode ? ` – ${a.pincode}` : ""}
                  </p>
                  {(a.contactName || a.contactPhone) && (
                    <p className="text-[11px] text-slate-500 inline-flex items-center gap-1">
                      <Phone className="w-3 h-3" />{" "}
                      {[a.contactName, a.contactPhone]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                  {(!a.city || !a.state) && (
                    <p className="text-[11px] font-semibold text-amber-700">
                      City or state missing. Edit to complete this address.
                    </p>
                  )}
                  <div className="flex flex-wrap items-center justify-end gap-1 pt-2 border-t border-slate-200/60 text-xs font-bold">
                    {!a.isDefault && (
                      <button
                        onClick={async () => {
                          try {
                            await setDefaultAddressApi(a.addressId);
                            await onChanged();
                            toast("Default address updated.");
                          } catch {
                            toast("Could not change the default address.");
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-slate-600 hover:bg-white inline-flex items-center gap-1"
                      >
                        <Star className="w-3.5 h-3.5" /> Make default
                      </button>
                    )}
                    <button
                      onClick={() => open(a)}
                      className="px-2.5 py-1.5 rounded-lg text-slate-700 hover:bg-white inline-flex items-center gap-1"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => setConfirmDel(a)}
                      className="px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                  {confirmDel?.addressId === a.addressId && (
                    <div
                      role="alertdialog"
                      className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs space-y-2"
                    >
                      <p className="font-semibold text-rose-900">
                        Delete “{a.label || KIND[k].label}”?
                        {a.isDefault && addresses.length > 1
                          ? " Choose another default afterwards."
                          : ""}
                      </p>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setConfirmDel(null)}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-700 bg-white"
                        >
                          Keep
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await deleteAddressApi(a.addressId);
                              await onChanged();
                              toast("Address deleted.");
                            } catch {
                              toast("Could not delete the address.");
                            } finally {
                              setConfirmDel(null);
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      ) : (
        !form && (
          <div className="py-10 text-center space-y-2">
            <MapPin className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700 text-sm">
              No saved addresses yet
            </p>
            <p className="text-xs text-slate-500">
              Add your home address once and it is filled in for lab home
              collection, home care and deliveries.
            </p>
            <button
              onClick={() => open()}
              className="mt-1 px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add your first address
            </button>
          </div>
        )
      )}
    </div>
  );
}
