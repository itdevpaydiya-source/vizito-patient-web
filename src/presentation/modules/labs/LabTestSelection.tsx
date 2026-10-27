import {useState, useEffect, useRef} from 'react';
import {FlaskConical, Search, X, ChevronRight, LifeBuoy, FileText, CalendarDays} from 'lucide-react';
import type {LabTestDef} from '../../../services/labHelper';
import './LabTestSelection.css';

export default function LabTestSelection({tests,chosen,onToggle,onClear,onContinue,query,onQuery}: {
  tests: LabTestDef[] | null; chosen: string[]; onToggle: (code:string)=>void; onClear:()=>void;
  onContinue:()=>void; query:string; onQuery:(query:string)=>void;
}) {
  const [mobile,setMobile]=useState(false);
  const [sheetOpen,setSheetOpen]=useState(false);
  const sheet=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const media=window.matchMedia('(max-width: 1023px)');const update=()=>{setMobile(media.matches);if(!media.matches)setSheetOpen(false);};update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
  useEffect(()=>{if(!chosen.length)setSheetOpen(false);},[chosen.length]);
  useEffect(()=>{const node=sheet.current;if(!sheetOpen||!node)return;const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;node.showModal();return()=>{node.close();previous?.isConnected&&previous.focus({preventScroll:true});};},[sheetOpen]);
  const [department,setDepartment]=useState('');
  const [sort,setSort]=useState('catalogue');
  const departments=Array.from(new Set((tests||[]).map(t=>t.department).filter(Boolean))).sort();
  const visible=(tests||[]).filter(t=>(!department||t.department===department)&&`${t.name} ${t.code} ${t.short_name||''}`.toLowerCase().includes(query.trim().toLowerCase())).sort((a,b)=>sort==='name' ? a.name.localeCompare(b.name) : 0);
  const selected=chosen.map(code=>({code,test:tests?.find(t=>t.code===code)}));
  const summary = (
    <aside aria-label="Selected tests" className="lab-selection-summary lab-selection-card">
      <header><h2>Selected tests ({chosen.length})</h2>{chosen.length>0&&<button type="button" onClick={onClear}>Clear all</button>}</header>
      {!chosen.length?<p className="lab-selection-message">Select tests to compare available labs and prices.</p>:<ul>{selected.map(({code,test})=><li key={code}><span className="lab-selection-summary-icon"><FlaskConical aria-hidden="true" size={20}/></span><strong>{test?.name||code}</strong><button type="button" aria-label={`Remove ${test?.name||code}`} onClick={()=>onToggle(code)}><X size={16}/></button></li>)}</ul>}
      <div className="lab-selection-pricing"><strong>Pricing</strong><p>Price shown after lab selection. Compare the actual total from labs offering your selected tests.</p></div>
      <button type="button" className="lab-selection-continue" disabled={!chosen.length} onClick={onContinue}>Continue to select centre <ChevronRight size={18} aria-hidden="true"/></button>
      <div className="lab-selection-guidance"><h3>Plan your lab visit</h3><p><CalendarDays size={16} aria-hidden="true"/>Choose from the selected lab’s available times.</p><p><FileText size={16} aria-hidden="true"/>View reports once released by the lab.</p></div>
      <div className="lab-selection-support"><LifeBuoy size={24} aria-hidden="true"/><div><h3>Need help?</h3><p>Get help with lab tests and bookings.</p><a className="lab-selection-help" href="/help">Get help</a></div></div>
    </aside>
  );
  return <div className={`lab-selection-layout ${mobile && chosen.length ? 'lab-selection-has-bar' : ''}`}>
    <section aria-label="Choose tests" className="lab-selection-card">
      <div className="lab-selection-toolbar"><label className="lab-selection-search"><Search aria-hidden="true" size={18}/><input aria-label="Search tests" placeholder={mobile ? 'Search tests (CBC, HbA1c\u2026)' : 'Search for tests (e.g. CBC, HbA1c, Vitamin D)'} value={query} onChange={e=>onQuery(e.target.value)}/></label><select aria-label="Test category" value={department} onChange={e=>setDepartment(e.target.value)}><option value="">All categories</option>{departments.map(value=><option key={value} value={value}>{value}</option>)}</select></div>
      <div className="lab-selection-categories" role="group" aria-label="Test departments">{['',...departments].map(value=><button key={value} type="button" aria-pressed={department===value} onClick={()=>setDepartment(value)}>{value||'All'}</button>)}</div>
      <header className="lab-selection-list-heading"><h2>Available tests{tests ? ` (${visible.length})` : ''}</h2><label className="lab-selection-sort">Sort by <select aria-label="Sort tests" value={sort} onChange={e=>setSort(e.target.value)}><option value="catalogue">Catalogue order</option><option value="name">Name A-Z</option></select></label></header>
      {!tests ? <p role="status">Loading tests...</p> : !visible.length ? <p className="lab-selection-message">{tests.length?'No tests match your search or category.':'No tests are available to book right now.'}</p> : <ul className="lab-selection-list">{visible.map(t=><li key={t.code}>
        <label className="lab-selection-test"><input type="checkbox" checked={chosen.includes(t.code)} onChange={()=>onToggle(t.code)}/><span className="lab-selection-icon"><FlaskConical aria-hidden="true" size={22}/></span><span className="lab-selection-test-copy"><strong>{t.name}</strong>{t.about&&<span>{t.about}</span>}<small className="lab-selection-tags">{[t.department,t.specimen_type].filter(Boolean).map((value,index)=><span key={index}>{value}</span>)}</small></span></label>
        <details className="lab-selection-details"><summary>View details</summary><div><p>{t.why_done||t.about||'Details not provided.'}</p>{t.fasting_hours>0&&<p>Fasting: {t.fasting_hours} hours</p>}{t.patient_instructions&&<p>{t.patient_instructions}</p>}{t.tat_hours>0&&<p>Catalogue turnaround: {t.tat_hours} hours. Confirm timing with your selected lab.</p>}</div></details>
      </li>)}</ul>}
    </section>
    {!mobile && summary}
    {mobile && chosen.length > 0 && <div className="lab-selection-mobile-bar" role="region" aria-label="Selected tests actions"><button type="button" className="lab-selection-count" aria-haspopup="dialog" aria-expanded={sheetOpen} onClick={()=>setSheetOpen(true)}>{chosen.length} {chosen.length===1?'test':'tests'} selected</button><button type="button" className="lab-selection-continue" onClick={onContinue}>Continue to select centre <ChevronRight aria-hidden="true" size={16}/></button></div>}
    {mobile && <dialog ref={sheet} aria-label="Selected tests sheet" className="lab-selection-sheet" onCancel={event=>{event.preventDefault();setSheetOpen(false);}}><div className="lab-selection-sheet-close"><button type="button" aria-label="Close selected tests" onClick={()=>setSheetOpen(false)}><X aria-hidden="true" size={20}/></button></div>{summary}</dialog>}
  </div>;
}

export function LabBookingProgress({step}:{step:number}) {
  return <ol className="lab-booking-progress" aria-label="Lab booking progress">{['Select tests','Choose a lab','Date & time','Review & confirm'].map((label,index)=><li key={label} aria-current={step===index+1?'step':undefined}><span>{index+1<step?'✓':index+1}</span><div><strong>{label}</strong><small>{['Choose tests or packages','Compare centres and prices','Choose an available appointment','Check details and book'][index]}</small></div></li>)}</ol>;
}
