import { useEffect, useState, useRef } from 'react';
import { MapPin, LocateFixed, Home, Briefcase, Plus, Check, Loader2, Sparkles, X, ChevronRight } from 'lucide-react';
import MapPreview from './MapPreview';
import ServiceLocationDialog from './ServiceLocationDialog';
import { addressAt, locateOnce, type LatLng, type SearchArea } from '../../../services/location';
import { getAddressesApi, type PatientAddress } from '../../../services/patientHelper';

export interface ResolvedAddress {
  line?: string;
  area?: string;
  city?: string;
  pincode?: string;
  landmark?: string;
  pin?: LatLng | null;
  label?: string;
}

export interface HomePinFieldProps {
  value: LatLng | null;
  onChange: (p: LatLng | null) => void;
  who: string;
  onAddressResolved?: (addr: ResolvedAddress) => void;
  currentAddress?: { line?: string; area?: string; city?: string; pincode?: string; landmark?: string };
}

const ADDR_ICONS: Record<string, typeof Home> = {
  HOME: Home,
  WORK: Briefcase,
};

export default function HomePinField({
  value,
  onChange,
  who,
  onAddressResolved,
  currentAddress,
}: HomePinFieldProps) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<PatientAddress[]>([]);
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [pinAddressText, setPinAddressText] = useState<string | null>(null);
  const [resolvedFromPin, setResolvedFromPin] = useState<ResolvedAddress | null>(null);
  const lastResolvedPinRef = useRef<string | null>(null);

  // Load saved addresses for quick 1-tap selection
  useEffect(() => {
    let alive = true;
    getAddressesApi()
      .then((list) => {
        if (alive) {
          setSaved([...list].sort((a, b) => Number(b.isDefault) - Number(a.isDefault)));
        }
      })
      .catch(() => {
        if (alive) setSaved([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  // When value (pin) changes or is loaded, reverse-geocode to offer quick form auto-fill
  useEffect(() => {
    if (!value) {
      setPinAddressText(null);
      setResolvedFromPin(null);
      lastResolvedPinRef.current = null;
      return;
    }
    const pinKey = `${value.lat.toFixed(5)},${value.lng.toFixed(5)}`;
    if (lastResolvedPinRef.current === pinKey) return;
    lastResolvedPinRef.current = pinKey;

    let alive = true;
    addressAt(value)
      .then((res) => {
        if (!alive || !res) return;
        setPinAddressText(res.text);
        setResolvedFromPin({
          line: res.line1 || '',
          area: res.area || '',
          city: res.city || '',
          pincode: res.pincode || '',
          pin: value,
        });
      })
      .catch(() => {
        if (alive) {
          setPinAddressText(null);
          setResolvedFromPin(null);
        }
      });

    return () => {
      alive = false;
    };
  }, [value]);

  const applySaved = (a: PatientAddress) => {
    const pin = a.pin || (a.latitude && a.longitude ? { lat: Number(a.latitude), lng: Number(a.longitude) } : null);
    onChange(pin);
    if (onAddressResolved) {
      onAddressResolved({
        line: a.addressLine1 || '',
        area: a.addressLine2 || '',
        city: a.city || '',
        pincode: a.pincode || '',
        landmark: a.landmark || '',
        pin,
        label: a.label || a.addressType || 'Saved address',
      });
    }
  };

  const applyGps = async () => {
    if (locating) return;
    setLocating(true);
    setGpsError(null);
    try {
      const pos = await locateOnce(true);
      const pin = { lat: pos.lat, lng: pos.lng };
      onChange(pin);
      try {
        const res = await addressAt(pin);
        if (res && onAddressResolved) {
          onAddressResolved({
            line: res.line1 || (res.text ? res.text.split(', ')[0] : ''),
            area: res.area || '',
            city: res.city || '',
            pincode: res.pincode || '',
            pin,
            label: 'Current location',
          });
        }
      } catch {
        if (onAddressResolved) {
          onAddressResolved({
            pin,
            label: 'Current location',
          });
        }
      }
    } catch {
      setGpsError('Could not get GPS location. Enable location permissions or choose on map.');
    } finally {
      setLocating(false);
    }
  };

  const handleApplyFromDialog = async (a: SearchArea | null) => {
    setOpen(false);
    if (!a) {
      onChange(null);
      return;
    }
    const pin = { lat: a.lat, lng: a.lng };
    onChange(pin);

    try {
      const res = await addressAt(pin);
      if (res && onAddressResolved) {
        onAddressResolved({
          line: res.line1 || (a.label && !a.label.includes('·') ? a.label.split(',')[0] : ''),
          area: res.area || (a.label && a.label.includes(',') ? a.label.split(',')[0] : ''),
          city: res.city || a.city || '',
          pincode: res.pincode || a.pincode || '',
          pin,
          label: a.label,
        });
      } else if (onAddressResolved) {
        onAddressResolved({
          city: a.city || '',
          pincode: a.pincode || '',
          pin,
          label: a.label,
        });
      }
    } catch {
      if (onAddressResolved) {
        onAddressResolved({
          city: a.city || '',
          pincode: a.pincode || '',
          pin,
          label: a.label,
        });
      }
    }
  };

  const isFormEmpty = !currentAddress?.line || currentAddress.line.trim().length === 0;

  return (
    <div className="sm:col-span-2 rounded-2xl border border-white/80 bg-white/70 backdrop-blur-xl p-3.5 sm:p-4 space-y-3 shadow-xs ring-1 ring-white/50" aria-label="Home pin">
      {/* Header and Quick-Action Chips */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-orange-700" />
            <span>Home pin &amp; arrival location</span>
          </span>
          <span className="text-[11px] font-semibold text-slate-500">
            Helps the {who} reach the exact entrance
          </span>
        </div>

        {/* 1-Tap Saved Addresses, GPS & Map Picker */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {saved.map((a) => {
            const Icon = ADDR_ICONS[String(a.addressType || '').toUpperCase()] || MapPin;
            const isMatch =
              !!a.pin &&
              !!value &&
              Math.abs(value.lat - a.pin.lat) < 1e-4 &&
              Math.abs(value.lng - a.pin.lng) < 1e-4;
            const label = a.addressType === 'HOME' ? 'Home' : a.addressType === 'WORK' ? 'Work' : a.label || 'Saved';
            return (
              <button
                key={a.addressId}
                type="button"
                onClick={() => applySaved(a)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all backdrop-blur-sm border ${
                  isMatch
                    ? 'bg-orange-800 text-white border-orange-800 shadow-md'
                    : 'bg-white/80 text-slate-700 border-white/80 hover:border-orange-300 hover:bg-white shadow-xs'
                }`}
                title={`${label}: ${a.addressLine1 || ''}, ${a.city || ''}`}
              >
                <Icon className={`w-3.5 h-3.5 ${isMatch ? 'text-white' : 'text-orange-700'}`} />
                <span>{label}</span>
                {a.isDefault && <span className={`text-[10px] px-1 py-0.2 rounded font-medium ${isMatch ? 'bg-orange-900 text-orange-100' : 'bg-slate-100 text-slate-500'}`}>Default</span>}
                {isMatch && <Check className="w-3.5 h-3.5" />}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => void applyGps()}
            disabled={locating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:border-teal-400 hover:bg-teal-50/50 transition disabled:opacity-60"
          >
            {locating ? <Loader2 className="w-3.5 h-3.5 text-teal-700 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5 text-teal-700" />}
            <span>{locating ? 'Locating…' : 'Current GPS'}</span>
          </button>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-orange-900 border border-orange-200 hover:bg-orange-50 hover:border-orange-300 transition"
          >
            <MapPin className="w-3.5 h-3.5 text-orange-700" />
            <span>{value ? 'Change on map' : 'Pick on map'}</span>
          </button>
        </div>

        {gpsError && (
          <p className="text-xs text-rose-700 font-semibold bg-rose-50 border border-rose-200 rounded-lg p-2" role="alert">
            {gpsError}
          </p>
        )}
      </div>

      {/* Map Preview & Form Autofill Card */}
      {value && (
        <div className="space-y-2 pt-1">
          <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm relative">
            <MapPreview lat={value.lat} lng={value.lng} label="Visit destination" height={160} zoom={16} />
            <div className="absolute top-2 right-2 z-10 flex gap-1.5">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-white/95 text-slate-800 text-xs font-bold border border-slate-200 shadow-sm hover:bg-white transition"
              >
                Adjust pin
              </button>
              <button
                type="button"
                onClick={() => onChange(null)}
                className="px-2 py-1 rounded-lg bg-white/95 text-rose-700 text-xs font-bold border border-rose-200 shadow-sm hover:bg-rose-50 transition"
                aria-label="Remove pin"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Reverse Geocode Info & 1-Tap Form Autofill Button */}
          {pinAddressText && onAddressResolved && (
            <div className="rounded-xl border border-sky-200 bg-sky-50/80 p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                <span className="font-bold text-sky-950 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                  <span>Address detected at map pin:</span>
                </span>
                <p className="text-sky-900 truncate mt-0.5">{pinAddressText}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (resolvedFromPin) onAddressResolved(resolvedFromPin);
                }}
                className={`shrink-0 px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm transition inline-flex items-center gap-1 ${
                  isFormEmpty
                    ? 'bg-sky-700 hover:bg-sky-800 text-white animate-pulse'
                    : 'bg-white hover:bg-sky-100 text-sky-900 border border-sky-300'
                }`}
              >
                <span>Autofill form fields</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {open && (
        <ServiceLocationDialog
          context="address"
          initialArea={
            value
              ? {
                  lat: value.lat,
                  lng: value.lng,
                  label: pinAddressText || 'Selected arrival point',
                  source: 'manual',
                  at: Date.now(),
                }
              : null
          }
          onClose={() => setOpen(false)}
          onApply={handleApplyFromDialog}
        />
      )}
    </div>
  );
}
