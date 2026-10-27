import {FlaskConical, ChevronRight} from 'lucide-react';
import {useState, type ComponentProps} from 'react';
import LabChooser from './LabChooser';
import {preparationText} from './labScheduleDetails';
import {rupees, type LabHit} from '../../../services/labHelper';
import './LabComparison.css';

export default function LabComparison({selectedTests,onChange,onContinue,canContinue,busy,selectedLab,...chooser}:ComponentProps<typeof LabChooser>&{
 selectedLab?:LabHit|null;selectedTests:{code:string;name:string;fasting_hours?:number;patient_instructions?:string|null}[];onChange:()=>void;onContinue:()=>void;canContinue:boolean;busy:boolean;
}) {
 const [hidden,setHidden]=useState(false);
 const [resetKey,setResetKey]=useState(0);
 const showSelected=()=>{chooser.onCity('');setResetKey(k=>k+1);};
 const selected=selectedLab || chooser.labs?.find(l=>l.id===chooser.selectedId);
 return <div className={`lab-comparison-layout ${selected ? 'lab-comparison-has-bar' : ''}`}>
  <section id="lab-choose" aria-label="Choose a lab" className="lab-comparison-main">
   <div className="lab-comparison-selected"><strong>Selected tests ({selectedTests.length})</strong><ul>{selectedTests.map(t=><li key={t.code}>{t.name}</li>)}</ul><button type="button" onClick={onChange}>Change tests</button></div>
   <div className="lab-comparison-results"><LabChooser {...chooser} resetKey={resetKey} onVisibilityChange={setHidden}/>
    {!chooser.error&&chooser.labs?.length===0&&<div className="lab-comparison-recovery"><p>Individual test availability is not provided here. Adjust your selection or try another area to compare again.</p><button type="button" onClick={onChange}>Change selected tests</button></div>}
   </div>
  </section>
  <aside aria-label="Lab selection summary" className="lab-comparison-summary">
   <header><h2>Your selection</h2><span>{selectedTests.length} {selectedTests.length===1?'test':'tests'} selected</span></header>
   <h3>Selected tests</h3><ul>{selectedTests.map(t=><li key={t.code}><FlaskConical size={18} aria-hidden="true"/><span>{t.name}</span>{selected?.selected.find(s=>s.code===t.code)?.price!=null&&<strong>{rupees(selected.selected.find(s=>s.code===t.code)!.price)}</strong>}</li>)}</ul>
   <div className="lab-comparison-summary-lab"><h3>Chosen lab</h3><strong>{selected?.name||'No lab selected'}</strong>{selected&&selected.locations.length>0&&<p>{selected.locations.map(c=>[c.name,c.city].filter(Boolean).join(', ')).join(' / ')||''}</p>}</div>
   {hidden&&selected&&<p className="lab-comparison-hidden" role="status">Your chosen lab is hidden by current filters <button type="button" onClick={showSelected}>Show it</button></p>}
   {selected&&typeof selected.total==='number'&&Number.isFinite(selected.total)&&selected.total>=0&&<div className="lab-comparison-total"><strong>{selected?.prices_vary?'Total from':'Total amount'}</strong><strong>{selected&&typeof selected.total==='number'&&Number.isFinite(selected.total)&&selected.total>=0?rupees(selected.total):null}</strong></div>}
   {selectedTests.some(t=>preparationText(t))&&<div className="lab-comparison-preparation"><h3>Preparation</h3>{selectedTests.filter(t=>preparationText(t)).map(t=><p key={t.code}>{t.name}: {preparationText(t)}</p>)}</div>}
   <p className="lab-comparison-note">Test total from the selected lab. Centre pricing and any supported home-collection fee are reviewed in the next step.</p>
   <button type="button" className="lab-comparison-next lab-comparison-desktop-next" disabled={!canContinue||busy} onClick={onContinue}>Continue to date and time <ChevronRight size={17} aria-hidden="true"/></button>
   {(!canContinue||busy)&&<p role="status" className="lab-comparison-note">{busy?'Please wait while your booking is being processed.':chooser.error?'Lab availability could not be checked. Retry before continuing.':!selected?'Select an eligible lab to continue.':'This lab has no valid collection centre. Choose another lab.'}</p>}
  </aside>
  {selected&&<div className="lab-comparison-mobile-bar" role="region" aria-label="Chosen lab actions"><span>{selected.name} {'\u00b7'} {typeof selected.total==='number'&&Number.isFinite(selected.total)&&selected.total>=0?rupees(selected.total):''}</span><button type="button" disabled={!canContinue||busy} onClick={onContinue}>Continue to date and time</button></div>}
 </div>;
}
