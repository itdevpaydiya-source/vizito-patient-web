import { useEffect, useState } from 'react';
import { getAddressesApi, type PatientAddress } from '../../../services/patientHelper';
import { useSearchArea, type SearchArea } from '../../../services/location';
import { validatePinCode } from '../../../utils/validators/india';

/** Where the care is needed: a saved address or an area (GPS / searched). The PIN code is internal only. */
export type CarePlace = { key: string; label: string; detail: string; pincode: string; kind: 'saved' | 'area'; lat?: number; lng?: number; /** Locality to name in copy ("doctors who visit Kondapur"). */ area?: string };

export const savedPlace = (a: PatientAddress): CarePlace => ({
  key: `saved:${a.addressId}`, kind: 'saved', pincode: a.pincode || '', lat: a.pin?.lat, lng: a.pin?.lng,
  label: a.addressType === 'HOME' ? 'Home' : a.addressType === 'WORK' ? 'Work' : a.label || 'Saved address',
  detail: [a.addressLine2 || a.addressLine1, a.city].filter(Boolean).join(', '),
  // The locality: area line, else the last part of the street line ("Flat 2, Lake View, Kondapur" → Kondapur), else the city.
  area: (a.addressLine2 || '').trim() || String(a.addressLine1 || '').split(',').map((x) => x.trim()).filter(Boolean).pop() || a.city || undefined,
});
export const areaPlace = (a: SearchArea): CarePlace => ({
  key: `area:${a.lat},${a.lng}`, kind: 'area', pincode: a.pincode || '', lat: a.lat, lng: a.lng,
  label: a.source === 'gps' ? 'Current location' : a.label.split(',')[0], detail: a.label, area: a.label.split(',')[0],
});
const valid = (p?: string | null) => !!p && validatePinCode(p).ok;
const KEY = 'vizito_hc_place';

/**
 * The patient's care location, shared by Home care › home and search: the place chosen last (this tab),
 * else the default saved address, else the area set in the location bar.
 */
export function useCarePlace(preferPin?: string | null) {
  const area = useSearchArea();
  const [saved, setSaved] = useState<PatientAddress[] | null>(null);
  const [place, setPlaceState] = useState<CarePlace | null>(() => {
    try { const p = JSON.parse(sessionStorage.getItem(KEY) || 'null'); return p && p.area && valid(p.pincode) && (!preferPin || p.pincode === preferPin) ? p : null; } catch { return null; }
  });
  const setPlace = (p: CarePlace | null) => {
    setPlaceState(p);
    try { if (p) sessionStorage.setItem(KEY, JSON.stringify(p)); else sessionStorage.removeItem(KEY); } catch { /* private mode */ }
  };
  useEffect(() => {
    let alive = true;
    getAddressesApi().then((list) => {
      if (!alive) return;
      const ok = list.filter((a) => valid(a.pincode));
      setSaved(ok);
      setPlaceState((cur) => {
        if (cur) return cur;
        const d = (preferPin && ok.find((a) => a.pincode === preferPin)) || ok.find((a) => a.isDefault) || ok[0];
        return d ? savedPlace(d) : area ? areaPlace(area) : null;
      });
    }).catch(() => { if (alive) { setSaved([]); setPlaceState((cur) => cur || (area ? areaPlace(area) : null)); } });
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return { saved, place, setPlace, area };
}
