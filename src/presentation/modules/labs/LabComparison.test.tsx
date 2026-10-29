import {it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import LabChooser from './LabChooser';
import LabComparison from './LabComparison';
import type {LabHit} from '../../../services/labHelper';
const record=(id:string,total:number,report_hours?:number):LabHit=>({id,name:id,total,report_hours,locations:[],selected:[{code:'T',name:'Actual test',price:total}],tests_offered:1});
const render=(labs:LabHit[])=>renderToStaticMarkup(<LabChooser labs={labs} city="" onCity={()=>{}} selectedId={null} onSelect={()=>{}}/>);
it('never turns missing report hours into a fastest badge or an infinite promise',()=>{
 const html=render([record('Missing',100),record('Known',150,12)]);
 expect(html).not.toContain('Report turnaround not provided');expect(html).not.toContain('Infinity');
 expect(html.match(/>Fastest report</g)).toHaveLength(1); // Sort control only, no comparative badge.
 expect(html).not.toContain('Vizito-verified');expect(html).not.toContain('Registration details not provided');expect(html).toContain('>Nearest<');
});
it('awards comparative badges only to unique best options among comparable records',()=>{
 const tied=render([record('A',100,6),record('B',100,6)]);
 expect(tied.match(/>Lowest price</g)).toHaveLength(1);expect(tied.match(/>Fastest report</g)).toHaveLength(1);
 const unique=render([record('A',100,6),record('B',150,12)]);
 expect(unique.match(/>Lowest price</g)).toHaveLength(2);expect(unique.match(/>Fastest report</g)).toHaveLength(2);
});
it('keeps chosen tests visible and explains blocked continuation without inventing prices',()=>{
 const html=renderToStaticMarkup(<LabComparison labs={[]} city="" onCity={()=>{}} selectedId={null} onSelect={()=>{}} selectedTests={[{code:'T',name:'Actual test'}]} onChange={()=>{}} onContinue={()=>{}} canContinue={false} busy={false}/>);
 expect(html).toContain('Actual test');expect(html).toContain('No eligible labs for selected tests');expect(html).toContain('Checking which tests can be booked together');expect(html).not.toContain('₹0');
});

it('does not offer a stale selected lab outside the current full-match results',()=>{
 const selected=record('Stale lab',120,6);
 const html=renderToStaticMarkup(<LabComparison labs={[]} selectedLab={selected} city="Elsewhere" onCity={()=>{}} selectedId={selected.id} onSelect={()=>{}} selectedTests={[{code:'T',name:'Actual test'}]} onChange={()=>{}} onContinue={()=>{}} canContinue={true} busy={false}/>);
 expect(html).not.toContain('Stale lab');expect(html).not.toContain('Choose this lab');expect(html).toContain('No eligible labs for selected tests');
});

import {comparisonDistance,nextAvailable,homeCollection,validPin} from './labComparisonDetails';
it('formats distances safely without a zero metre promise',()=>{
 expect(comparisonDistance(1)).toBe('50 m');expect(comparisonDistance(324)).toBe('300 m');expect(comparisonDistance(1234)).toBe('1.2 km');expect(comparisonDistance(NaN)).toBe('');expect(validPin({lat:91,lng:1})).toBe(false);
});
it('formats timezone-less API slots as IST independently of the browser timezone',()=>{
 const now=new Date('2026-10-24T00:00:00Z');expect(nextAvailable('2026-10-24T13:00',now)).toBe('Today, 1:00 PM');expect(nextAvailable('2026-10-25T09:30',now)).toBe('Tomorrow, 9:30 AM');expect(nextAvailable(null,now)).toBeNull();expect(nextAvailable('bad',now)).toBeNull();
});
it('uses the actual PIN coverage and omits absent home information',()=>{
 const lab=record('A',100);expect(homeCollection(lab)).toBeNull();lab.settings={centre_hours:{},home:{enabled:true,fee:100,pincodes:['500081'],open:'09:00',close:'17:00'}};
 expect(homeCollection(lab)).toContain('Available in selected areas');expect(homeCollection(lab,'500081')).toContain('Available (+');expect(homeCollection(lab,'500072')).toBe('Not available at your PIN 500072');lab.settings.home.enabled=false;expect(homeCollection(lab)).toBe('Not offered');
});

it('renders supplied trust and rating as text and omits them when absent',()=>{
 const absent=render([record('A',100)]);expect(absent).not.toContain('reviews');expect(absent).not.toContain('NABL');expect(absent).not.toContain('View on map');
 const lab=record('B',200);lab.rating={average:4.6,count:128};lab.nabl={cert_no:'MC-1234',valid_until:'2028-03-31',source:'lab_declared',verification_status:'DECLARED'};lab.logo_url='/actual-logo.png';
 const html=render([lab]);expect(html).toContain('128 reviews');expect(html).toContain('NABL certificate MC-1234');expect(html).toContain('/actual-logo.png');expect(html).not.toContain('accredited');expect(html).not.toContain('Verified pathologist');
});

it('shows an accreditation badge only with a verified certificate',()=>{const lab=record('Verified lab',200);lab.nabl={cert_no:'MC-9000',valid_until:'2028-03-31',source:'ops',verification_status:'VERIFIED'};expect(render([lab])).toContain('lj-accredited');lab.nabl.verification_status='DECLARED';expect(render([lab])).not.toContain('lj-accredited');expect(render([lab])).toContain('NABL certificate MC-9000');});
