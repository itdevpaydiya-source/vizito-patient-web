import VizitoDialog from '../../components/dialogs/VizitoDialog';
import ThemedSelect from '../../components/forms/ThemedSelect';
import {validatePersonName,validateDob,validateMobile} from '../../../utils/validators/india';
import {Avatar} from './FamilyParts';
import {useState,useRef,type FormEvent} from 'react';
import {X} from 'lucide-react';
import {FAMILY_RELATIONSHIPS,type FamilyRelationship} from '../../../services/familyHelper';
import {BLOOD_GROUPS} from '../../../services/healthProfileHelper';
import {familyJourneyApi,familyError,type FamilyDetail,type FamilyInput} from '../../../services/familyJourneyHelper';

type FieldKey='name'|'dob'|'gender'|'phone'|'ecName'|'ecPhone'|'ecRelation';
type FieldErrors=Partial<Record<FieldKey,string>>;

function Chips({label,values,onChange,disabled}:{label:string;values:string[];onChange:(v:string[])=>void;disabled:boolean}){
 const [text,setText]=useState('');
 const add=()=>{const value=text.trim();if(value&&!values.some(v=>v.toLowerCase()===value.toLowerCase()))onChange([...values,value]);setText('');};
 return <label className="fm-field">{label}<span className="fm-chips">{values.map(value=><span key={value}>{value}<button type="button" disabled={disabled} aria-label={`Remove ${value}`} onClick={()=>onChange(values.filter(v=>v!==value))}><X size={12}/></button></span>)}</span><span className="fm-chip-input"><input aria-label={label} disabled={disabled} value={text} maxLength={100} placeholder="Type and add" onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'||e.key===','){e.preventDefault();add();}}} onBlur={add}/><button type="button" disabled={disabled||!text.trim()} onClick={add}>Add</button></span></label>;
}

const NAME_CHAR_RE=/^[\p{L}\p{M} .'-]+$/u;
const validateMemberName=(raw:string):string|undefined=>{
 const clean=raw.trim().replace(/\s+/g,' ');
 if(!clean)return 'Enter the family member’s full name.';
 if(!NAME_CHAR_RE.test(clean))return 'Full name can only contain letters, spaces, dots, apostrophes, and hyphens.';
 if(!validatePersonName(clean).ok)return 'Enter a full name with at least 2 characters.';
 return undefined;
};
const validateMemberDob=(raw:string):string|undefined=>{
 if(!raw.trim())return 'Select a date of birth.';
 if(!validateDob(raw).ok)return 'Enter a valid date of birth in the past.';
 return undefined;
};
const validateMemberPhone=(raw:string,required=false):string|undefined=>{
 const clean=raw.trim();
 if(!clean)return required?'Enter a 10-digit Indian mobile number starting with 6, 7, 8, or 9.':undefined;
 if(!/^[6-9]\d{9}$/.test(clean)||!validateMobile(clean,{required:false}).ok){
  return 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.';
 }
 return undefined;
};

export default function MemberEditor({userId,member,onClose,onSaved}:{userId:number;member?:FamilyDetail;onClose:()=>void;onSaved:()=>void}){
 const h=member?.health,locked=!!member&&!member.can_edit_details;
 const [name,setName]=useState(member?.full_name||''),[relationship,setRelationship]=useState<FamilyRelationship>((member?.relationship||'Spouse') as FamilyRelationship),[dob,setDob]=useState(member?.date_of_birth?.slice(0,10)||''),[gender,setGender]=useState(member?.gender||''),[blood,setBlood]=useState(h?.blood_group||''),[phone,setPhone]=useState(member?.phone||'');
 const [allergies,setAllergies]=useState(h?.allergies.map(a=>a.allergen)||[]),[conditions,setConditions]=useState(h?.conditions||[]),[emergency,setEmergency]=useState(!!h?.emergency_contact),[ecName,setEcName]=useState(h?.emergency_contact?.name||''),[ecPhone,setEcPhone]=useState(h?.emergency_contact?.phone||''),[ecRelation,setEcRelation]=useState(h?.emergency_contact?.relation||'');
 const [fieldErrors,setFieldErrors]=useState<FieldErrors>({}),[submitted,setSubmitted]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);

 const nameRef=useRef<HTMLInputElement>(null);
 const dobRef=useRef<HTMLInputElement>(null);
 const genderRef=useRef<HTMLSelectElement>(null);
 const phoneRef=useRef<HTMLInputElement>(null);
 const ecNameRef=useRef<HTMLInputElement>(null);
 const ecPhoneRef=useRef<HTMLInputElement>(null);
 const ecRelationRef=useRef<HTMLInputElement>(null);

 const clearOrRevalidate=(key:FieldKey,nextErr:string|undefined)=>{
  setFieldErrors(prev=>{
   if(!submitted&&!prev[key])return prev;
   const copy={...prev};
   if(nextErr)copy[key]=nextErr;else delete copy[key];
   return copy;
  });
 };

 async function submit(e:FormEvent){e.preventDefault();setError('');
  if(!locked){
   setSubmitted(true);
   const nextErrors:FieldErrors={};
   const nameErr=validateMemberName(name);if(nameErr)nextErrors.name=nameErr;
   const dobErr=validateMemberDob(dob);if(dobErr)nextErrors.dob=dobErr;
   if(!gender)nextErrors.gender='Select a gender.';
   const phoneErr=validateMemberPhone(phone,false);if(phoneErr)nextErrors.phone=phoneErr;
   if(emergency){
    const ecNameErr=validateMemberName(ecName);if(ecNameErr)nextErrors.ecName='Enter the emergency contact’s full name (letters only).';
    const ecPhoneErr=validateMemberPhone(ecPhone,true);if(ecPhoneErr)nextErrors.ecPhone=ecPhoneErr;
    if(!ecRelation.trim())nextErrors.ecRelation='Enter the relationship.';
   }
   setFieldErrors(nextErrors);
   if(Object.keys(nextErrors).length>0){
    const first=(
     nextErrors.name?nameRef.current:
     nextErrors.dob?dobRef.current:
     nextErrors.gender?genderRef.current:
     nextErrors.phone?phoneRef.current:
     nextErrors.ecName?ecNameRef.current:
     nextErrors.ecPhone?ecPhoneRef.current:
     ecRelationRef.current
    );
    (first as HTMLElement|null)?.focus();
    return;
   }
  }
  const input:FamilyInput=locked?{relationship}:{relationship,full_name:name.trim(),first_name:name.trim(),date_of_birth:dob,gender,phone:phone.trim(),health:{blood_group:blood,height_cm:h?.height_cm??null,weight_kg:h?.weight_kg??null,allergies:allergies.map(allergen=>h?.allergies.find(a=>a.allergen===allergen)||{allergen}),no_known_allergies:allergies.length?false:h?.no_known_allergies||false,conditions,medications:h?.medications||[],emergency_contact_name:emergency?ecName.trim():'',emergency_contact_phone:emergency?ecPhone.trim():'',emergency_contact_relation:emergency?ecRelation.trim():''}};
  setBusy(true);try{if(member)await familyJourneyApi.update(userId,member.association_id,input);else await familyJourneyApi.add(userId,input);onSaved();}catch(e){setError(familyError(e));}finally{setBusy(false);}
 }
 return <VizitoDialog title={member?'Edit member':'Add family member'} onClose={()=>{if(!busy)onClose();}} className={`portal-migrated fm-modal ${member?'fm-editor-edit':'fm-editor-add'}`}><header><div><h2 id="fm-editor-title">{member?'Edit member':'Add family member'}</h2><p>Keep your family’s health details in one place.</p></div><button type="button" aria-label="Close member editor" disabled={busy} onClick={onClose}><X/></button></header>
<form onSubmit={submit} noValidate>{member&&<div className="fm-editor-avatar"><Avatar name={member.full_name} src={member.profile_picture}/></div>}{locked&&<p className="fm-note">This member has their own Vizito account. Only Relationship can be changed here.</p>}{!locked&&<p className="fm-required-hint">Fields marked with <span className="fm-req" aria-hidden="true">*</span> are required.</p>}<div className="fm-form-grid"><label><span className="fm-label-row">Full name <span className="fm-req" aria-hidden="true">*</span></span><input ref={nameRef} aria-label="Full name" aria-required="true" aria-invalid={!!fieldErrors.name} aria-describedby={fieldErrors.name?'fm-err-name':undefined} autoFocus disabled={locked} value={name} maxLength={100} onChange={e=>{const val=e.target.value;setName(val);clearOrRevalidate('name',validateMemberName(val));}} onBlur={()=>!locked&&clearOrRevalidate('name',validateMemberName(name))}/>{fieldErrors.name&&<span id="fm-err-name" className="fm-field-error" role="alert">{fieldErrors.name}</span>}</label><label><span className="fm-label-row">Relationship <span className="fm-req" aria-hidden="true">*</span></span><ThemedSelect aria-label="Relationship" aria-required="true" value={relationship} onChange={e=>setRelationship(e.target.value as FamilyRelationship)}>{FAMILY_RELATIONSHIPS.map(r=><option key={r}>{r}</option>)}</ThemedSelect></label><label><span className="fm-label-row">Date of birth <span className="fm-req" aria-hidden="true">*</span></span><input ref={dobRef} aria-label="Date of birth" aria-required="true" aria-invalid={!!fieldErrors.dob} aria-describedby={fieldErrors.dob?'fm-err-dob':undefined} type="date" disabled={locked} value={dob} max={new Date().toISOString().slice(0,10)} onChange={e=>{const val=e.target.value;setDob(val);clearOrRevalidate('dob',validateMemberDob(val));}} onBlur={()=>!locked&&clearOrRevalidate('dob',validateMemberDob(dob))}/>{fieldErrors.dob&&<span id="fm-err-dob" className="fm-field-error" role="alert">{fieldErrors.dob}</span>}</label><label><span className="fm-label-row">Gender <span className="fm-req" aria-hidden="true">*</span></span><ThemedSelect ref={genderRef} aria-label="Gender" aria-required="true" aria-invalid={!!fieldErrors.gender} aria-describedby={fieldErrors.gender?'fm-err-gender':undefined} disabled={locked} value={gender} onChange={e=>{const val=e.target.value;setGender(val);clearOrRevalidate('gender',val?undefined:'Select a gender.');}}><option value="">Select gender</option>{['Male','Female','Other'].map(g=><option key={g}>{g}</option>)}</ThemedSelect>{fieldErrors.gender&&<span id="fm-err-gender" className="fm-field-error" role="alert">{fieldErrors.gender}</span>}</label><label>Blood group<ThemedSelect aria-label="Blood group" disabled={locked} value={blood} onChange={e=>setBlood(e.target.value)}><option value="">Not specified</option>{BLOOD_GROUPS.map(b=><option key={b}>{b}</option>)}</ThemedSelect></label><label>Phone (optional)<span className="fm-phone"><span className="fm-phone-prefix">+91</span><input ref={phoneRef} aria-label="Phone (optional)" aria-invalid={!!fieldErrors.phone} aria-describedby={fieldErrors.phone?'fm-err-phone':undefined} inputMode="numeric" disabled={locked} maxLength={10} placeholder="10-digit mobile number" value={phone} onChange={e=>{const val=e.target.value.replace(/\D/g,'').slice(0,10);setPhone(val);clearOrRevalidate('phone',validateMemberPhone(val,false));}} onBlur={()=>!locked&&clearOrRevalidate('phone',validateMemberPhone(phone,false))}/></span>{fieldErrors.phone&&<span id="fm-err-phone" className="fm-field-error" role="alert">{fieldErrors.phone}</span>}</label><Chips label="Allergies" disabled={locked} values={allergies} onChange={setAllergies}/><Chips label="Chronic conditions" disabled={locked} values={conditions} onChange={setConditions}/></div><label className="fm-check"><input type="checkbox" role="switch" disabled={locked} checked={emergency} onChange={e=>setEmergency(e.target.checked)}/>Add an emergency contact</label>{emergency&&<div className="fm-form-grid fm-emergency"><label><span className="fm-label-row">Contact name <span className="fm-req" aria-hidden="true">*</span></span><input ref={ecNameRef} aria-required="true" aria-invalid={!!fieldErrors.ecName} aria-describedby={fieldErrors.ecName?'fm-err-ecName':undefined} disabled={locked} value={ecName} onChange={e=>{const val=e.target.value;setEcName(val);clearOrRevalidate('ecName',validateMemberName(val)?'Enter the emergency contact’s full name (letters only).':undefined);}}/>{fieldErrors.ecName&&<span id="fm-err-ecName" className="fm-field-error" role="alert">{fieldErrors.ecName}</span>}</label><label><span className="fm-label-row">Contact phone <span className="fm-req" aria-hidden="true">*</span></span><input ref={ecPhoneRef} aria-required="true" aria-invalid={!!fieldErrors.ecPhone} aria-describedby={fieldErrors.ecPhone?'fm-err-ecPhone':undefined} disabled={locked} inputMode="numeric" maxLength={10} value={ecPhone} onChange={e=>{const val=e.target.value.replace(/\D/g,'').slice(0,10);setEcPhone(val);clearOrRevalidate('ecPhone',validateMemberPhone(val,true));}}/>{fieldErrors.ecPhone&&<span id="fm-err-ecPhone" className="fm-field-error" role="alert">{fieldErrors.ecPhone}</span>}</label><label><span className="fm-label-row">Contact relationship <span className="fm-req" aria-hidden="true">*</span></span><input ref={ecRelationRef} aria-required="true" aria-invalid={!!fieldErrors.ecRelation} aria-describedby={fieldErrors.ecRelation?'fm-err-ecRelation':undefined} disabled={locked} value={ecRelation} onChange={e=>{const val=e.target.value;setEcRelation(val);clearOrRevalidate('ecRelation',val.trim()?undefined:'Enter the relationship.');}}/>{fieldErrors.ecRelation&&<span id="fm-err-ecRelation" className="fm-field-error" role="alert">{fieldErrors.ecRelation}</span>}</label></div>}{error&&<p role="alert" className="fm-error">{error}</p>}<footer><button type="button" className="fm-secondary" disabled={busy} onClick={onClose}>Cancel</button><button className="fm-primary" disabled={busy}>{busy?'Saving…':member?'Save changes':'Add member'}</button></footer></form></VizitoDialog>;
}
