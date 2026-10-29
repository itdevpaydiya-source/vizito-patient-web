import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import apiClient from './index';
import {getPatientProfileApi} from './patientHelper';
import type { BasketLine } from '../presentation/modules/pharmacy/medicineBasket';
export interface SavedPharmacyBasket { pharmacyId: string; pharmacyName?: string | null; version: number; lines: BasketLine[] }
const normalize = (basket: SavedPharmacyBasket): SavedPharmacyBasket => ({ ...basket, lines: basket.lines.map(line => ({ ...line, medicine: { ...line.medicine, mrp: line.medicine.mrp == null ? NaN : Number(line.medicine.mrp) } })) });
export interface PharmacyDraft {lines:BasketLine[];pharmacyId?:string;prescriptionId?:string;requestId?:string;subject?:string;prescriptionSource?:'vizito'|'upload';documentId?:string;documentName?:string;documentSubject?:string}
export const pharmacyDraftKey=(patientId:string)=>`vizito_pharmacy_draft:${patientId}`;
export function readPharmacyDraft(value:string|null):PharmacyDraft{try{const draft=JSON.parse(value||'null');if(!draft||!Array.isArray(draft.lines))return {lines:[]};return {...draft,lines:draft.lines.filter((l:any)=>l?.medicine&&typeof l.medicine.id==='string'&&Number.isSafeInteger(l.quantity)&&l.quantity>0)};}catch{return {lines:[]};}}
interface BasketState {
  draft:PharmacyDraft; draftReady:boolean; draftError:string|null; updateDraft:(next:PharmacyDraft|((current:PharmacyDraft)=>PharmacyDraft))=>boolean;
  baskets: Record<string, SavedPharmacyBasket>; loading: boolean; saving: boolean; error: string | null;
  update: (pharmacyId: string, lines: BasketLine[]) => boolean;
  isPersisted: (pharmacyId: string) => boolean;
  reload: () => Promise<void>; flush: () => Promise<void>;
}
const Context = createContext<BasketState | null>(null);
const session = () => localStorage.getItem('vizito_token') || localStorage.getItem('vizito_user') || '';
export function PharmacyBasketProvider({children}: {children: ReactNode}) {
  const [draft,setDraft]=useState<PharmacyDraft>({lines:[]});
  const draftRef=useRef(draft),draftKey=useRef('');
  const [draftReady,setDraftReady]=useState(false),[draftError,setDraftError]=useState<string|null>(null);
  const [baskets, setBaskets] = useState<Record<string, SavedPharmacyBasket>>({});
  const current = useRef(baskets);
  const confirmed = useRef<Record<string, SavedPharmacyBasket>>({});
  const versions = useRef<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blocked = useRef(false);
  const pending = useRef(0);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const generation = useRef(0);
  const owner = useRef(session());
  const publish = (value: Record<string, SavedPharmacyBasket>) => { current.current = value; setBaskets(value); };
  const reload = useCallback(async () => {
    const token = session();
    const epoch = ++generation.current;
    owner.current = token;
    setLoading(true); setError(null); blocked.current = true;setDraftReady(false);setDraftError(null);draftKey.current='';
    try {const profile=await getPatientProfileApi();if(epoch===generation.current&&session()===token&&profile?.patientProfileId){draftKey.current=pharmacyDraftKey(profile.patientProfileId);const value=readPharmacyDraft(localStorage.getItem(draftKey.current));draftRef.current=value;setDraft(value);setDraftReady(true);}}catch{if(epoch===generation.current)setDraftError('Your medicine draft could not be loaded. Retry before adding medicines.');}
    try {
      await queue.current;
      if (!token) { if (epoch === generation.current) { publish({}); blocked.current = false; } return; }
      const response = await apiClient.get<SavedPharmacyBasket[]>('/orders/baskets');
      if (epoch !== generation.current || session() !== token) return;
      const rows = response.data.map(normalize);
      versions.current = Object.fromEntries(rows.map(b => [b.pharmacyId, b.version]));
      confirmed.current = Object.fromEntries(rows.map(b => [b.pharmacyId, b]));
      publish(confirmed.current);
      blocked.current = false;
    } catch { if (epoch === generation.current) setError('Your saved baskets could not be loaded. Reload saved baskets before adding medicines.'); }
    finally { if (epoch === generation.current) setLoading(false); }
  }, []);
  useEffect(() => {
    void reload();
    const changed = () => { if (owner.current !== session()) { publish({}); confirmed.current = {}; versions.current = {};draftRef.current={lines:[]};setDraft({lines:[]});setDraftReady(false); void reload(); } };
    window.addEventListener('vizito-auth-changed', changed); window.addEventListener('storage', changed);
    return () => { generation.current++; window.removeEventListener('vizito-auth-changed', changed); window.removeEventListener('storage', changed); };
  }, [reload]);
  const update = (pharmacyId: string, lines: BasketLine[]) => {
    if (blocked.current || loading || !session() || session() !== owner.current) return false;
    const token = owner.current;
    const epoch = generation.current;
    const previous = current.current[pharmacyId];
    const snapshot = { ...current.current[pharmacyId], pharmacyId, lines, version: versions.current[pharmacyId] || 0 };
    publish({ ...current.current, [pharmacyId]: snapshot });
    pending.current++; setSaving(true);
    queue.current = queue.current.then(async () => {
      try {
        if (blocked.current || epoch !== generation.current || session() !== token) return;
        const response = await apiClient.put<SavedPharmacyBasket>(`/orders/baskets/${encodeURIComponent(pharmacyId)}`, { version: versions.current[pharmacyId] || 0, items: lines.map(l => ({medicine_id:l.medicine.id,quantity:l.quantity})) });
        if (epoch !== generation.current || session() !== token) return;
        const saved = normalize(response.data);
        versions.current[pharmacyId] = saved.version;
        confirmed.current[pharmacyId] = saved;
        if (current.current[pharmacyId] === snapshot) publish({ ...current.current, [pharmacyId]: saved });
      } catch (failure: any) {
        if (epoch === generation.current) {
          blocked.current = true;
          if (!lines.length && previous && current.current[pharmacyId] === snapshot) publish({ ...current.current, [pharmacyId]: previous });
          setError(failure?.response?.data?.message || 'Basket changes could not be saved. Reload saved baskets to restore the last saved items.');
        }
      } finally { pending.current--; if (!pending.current) setSaving(false); }
    });
    return true;
  };
  const updateDraft=(next:PharmacyDraft|((current:PharmacyDraft)=>PharmacyDraft))=>{if(!draftKey.current||!draftReady||session()!==owner.current)return false;const value=typeof next==='function'?next(draftRef.current):next;try{localStorage.setItem(draftKey.current,JSON.stringify(value));draftRef.current=value;setDraft(value);setDraftError(null);return true;}catch{setDraftError('Your basket could not be saved in this browser. Allow local storage and retry.');return false;}};
  return <Context.Provider value={{draft,draftReady,draftError,updateDraft,baskets,loading,saving,error,update,reload,isPersisted:(id)=>!!current.current[id] && current.current[id] === confirmed.current[id],flush:()=>queue.current}}>{children}</Context.Provider>;
}
export function usePharmacyBaskets() {
  const context = useContext(Context);
  if (!context) throw new Error('PharmacyBasketProvider is required');
  return context;
}
