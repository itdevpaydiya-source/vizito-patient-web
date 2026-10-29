import api from '../../../services/index';
import axios from 'axios';
export type RecordType='PRESCRIPTION'|'LAB_REPORT'|'DOCUMENT';
export interface Subject{key:string;name:string|null;relationship:string}
export interface RxRecord{id:string;number:string|null;date:string;doctor_name:string|null;clinic_name:string|null;diagnosis:string|null;medicine_count:number;followup_date:string|null;has_pdf:boolean}
export interface LabRecord{order_id:string;order_number:string;lab_name:string|null;location_name:string|null;released_at:string;tests:string[];abnormal_count:number}
export interface DocumentRecord{id:string;doc_type:string;doc_type_label:string;doc_date:string|null;provider_name:string|null;note:string|null;file_name:string;mime_type:string;size_bytes:number;created_at:string}
export interface RecordList{subject:Subject;prescriptions:RxRecord[];lab_reports:LabRecord[];documents:DocumentRecord[]}
export interface TimelinePage{items:Array<(RxRecord&{record_type:'prescription'})|(LabRecord&{record_type:'lab_report';date:string|null})|(DocumentRecord&{record_type:'document';date:string})>;page:number;page_size:10|20;total:number;total_pages:number}
export interface Vital{recorded_at:string;prescription_id:string;height_cm:number|null;weight_kg:number|null;bmi:number|null;temperature:number|null;pulse:number|null;systolic_bp:number|null;diastolic_bp:number|null;respiratory_rate:number|null;spo2:number|null;blood_sugar:number|null}
export interface RecordsSummary{subject:Subject;latest_report:{order_id:string;order_number:string;lab_name:string|null;released_at:string}|null;active_medicines:{name:string;strength:string|null;frequency:string|null;start_date:string;end_date:string;prescription_id:string}[];next_follow_up:{date:string;doctor_name:string|null;prescription_id:string}|null;allergies:{no_known_allergies:boolean;items:{allergen:string;severity:string|null;reaction:string|null}[];source:string};vitals:Vital[]}
export interface ShareLink{id:string;expires_at:string;revoked_at:string|null;view_count:number;last_viewed_at:string|null;created_at:string;active:boolean}
export interface NewShare{id:string;url:string;expires_at:string}
export interface PublicRecord{record_type:RecordType;expires_at:string;has_file:boolean;document?:DocumentRecord;prescription?:{prescription_number:string;date:string;diagnosis_summary:string|null;general_advice:string|null;followup_date:string|null;doctor_name:string|null;patient_name:string|null;medicines:{name:string;strength:string|null;frequency:string|null;duration_days:number|null;instructions:string|null}[]};lab_report?:{order_number:string;lab_name:string|null;patient_name:string|null;released_at:string;results:{component_name?:string|null;test_name:string;value:string;unit:string|null;flag:string|null;reference_range:string|null}[]}}
const publicApi=axios.create({baseURL:import.meta.env.VITE_API_URL||'http://localhost:3000',timeout:30000,headers:{Accept:'application/json'}});
export const recordsApi={
 subjects:async():Promise<Subject[]> =>(await api.get('/patient-records/subjects')).data,
 list:async(subject:string):Promise<RecordList> =>(await api.get('/patient-records',{params:{subject}})).data,
 timeline:async(params:{subject:string;record_type?:string;q?:string;date_from?:string;date_to?:string;page:number;page_size:10|20}):Promise<TimelinePage> =>(await api.get('/patient-records/timeline',{params})).data,
 summary:async(subject:string):Promise<RecordsSummary> =>(await api.get('/patient-records/summary',{params:{subject}})).data,
 upload:async(form:FormData):Promise<DocumentRecord> =>(await api.post('/patient-records/documents',form,{headers:{'Content-Type':'multipart/form-data'}})).data,
 file:async(id:string):Promise<Blob> =>(await api.get(`/patient-records/documents/${encodeURIComponent(id)}/file`,{responseType:'blob'})).data,
 remove:async(id:string)=>api.delete(`/patient-records/documents/${encodeURIComponent(id)}`),
 shares:async(type:RecordType,id:string):Promise<ShareLink[]> =>(await api.get('/patient-records/shares',{params:{record_type:type,record_id:id}})).data,
 share:async(type:RecordType,id:string,expires_in:string):Promise<NewShare> =>(await api.post('/patient-records/shares',{record_type:type,record_id:id,expires_in})).data,
 revoke:async(id:string)=>api.delete(`/patient-records/shares/${encodeURIComponent(id)}`),
 publicRecord:async(token:string):Promise<PublicRecord> =>(await publicApi.get(`/shared-records/${encodeURIComponent(token)}`)).data,
 publicFile:async(token:string):Promise<Blob> =>(await publicApi.get(`/shared-records/${encodeURIComponent(token)}/file`,{responseType:'blob'})).data,
};
export const recordError=(e:unknown)=>{const x=e as {response?:{data?:{message?:string|string[]}};message?:string};const m=x.response?.data?.message||x.message||'Please try again.';return Array.isArray(m)?m.join(' '):m;};
export const recordStamp=(v:string)=>/^\d{4}-\d{2}-\d{2}$/.test(v)?recordDate(v):new Date(v).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'});
export const recordDate=(v:string)=>new Date(v.slice(0,10)+'T12:00:00Z').toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',year:'numeric'});
export function openRecordBlob(blob:Blob,name?:string,download=false){const url=URL.createObjectURL(blob);if(download){const a=document.createElement('a');a.href=url;a.download=name||'document';a.click();}else window.open(url,'_blank','noopener');window.setTimeout(()=>URL.revokeObjectURL(url),60000);}
export const docTypes={PRESCRIPTION:'Prescription',LAB_REPORT:'Lab report',XRAY:'X-ray',SCAN_REPORT:'Scan report (CT/MRI/USG)',DISCHARGE_SUMMARY:'Discharge summary',VACCINATION:'Vaccination record',OTHER:'Other'};
