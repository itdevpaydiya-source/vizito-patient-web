import {expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {calendarCells,dayAvailable,groupSlots,slotLabel,slotRemaining,validHomePin,restoreAppointment,preparationText} from './labScheduleDetails';
import {centreLocality} from './labComparisonDetails';
import type {LabAvailabilityDay,LabAvailability,LabHit} from '../../../services/labHelper';
import LabSchedule from './LabSchedule';
const days:LabAvailabilityDay[]=[{date:'2026-10-24',weekday:6,open:true,slots:[{time:'09:00',available:false,left:0},{time:'13:00',available:true,left:2}]},{date:'2026-10-25',weekday:0,open:false,slots:[]},{date:'2026-10-26',weekday:1,open:true,slots:[{time:'17:30',available:false,left:0}]}];
it('builds calendar cells only from returned availability, with available dots and disabled closed/full days',()=>{
 const cells=calendarCells('2026-10',days).filter(c=>c!==null);
 expect(cells.find(c=>c.date==='2026-10-24')?.available).toBe(true);
 expect(cells.find(c=>c.date==='2026-10-25')).toMatchObject({available:false,reason:'Closed'});
 expect(cells.find(c=>c.date==='2026-10-26')).toMatchObject({available:false,reason:'Fully booked'});
 expect(cells.find(c=>c.date==='2026-10-27')).toMatchObject({available:false,day:undefined});
 expect(calendarCells('2026-12',days).filter(c=>c?.available)).toHaveLength(0);
 expect(dayAvailable(days[1])).toBe(false);
});
it('groups API slots at noon and 17:00 and formats noon/midnight in 12-hour time',()=>{
 const groups=groupSlots(['00:00','11:30','12:00','16:30','17:00'].map(time=>({time,available:true,left:null})));
 expect(groups.map(g=>g.slots.length)).toEqual([2,2,1]);expect(slotLabel('00:00')).toBe('12:00 AM');expect(slotLabel('12:00')).toBe('12:00 PM');expect(slotLabel('17:30')).toBe('5:30 PM');
});
it('shows remaining capacity only at three or fewer and labels full slots',()=>{
 expect(slotRemaining({time:'09:00',available:true,left:null})).toBeNull();expect(slotRemaining({time:'09:00',available:true,left:4})).toBeNull();expect(slotRemaining({time:'09:00',available:true,left:2})).toBe('2 left');expect(slotRemaining({time:'09:00',available:false,left:0})).toBe('Full');
});
it('restores only available URL appointments; capacity refresh can retain a fully booked day',()=>{
 expect(restoreAppointment(days,'2026-10-24','13:00')).toEqual({date:'2026-10-24',time:'13:00'});
 expect(restoreAppointment(days,'2026-10-26','17:30')).toEqual({date:'2026-10-24',time:''});
 expect(restoreAppointment(days,'2026-10-26','17:30',true)).toEqual({date:'2026-10-26',time:''});
 expect(restoreAppointment([],'2026-10-24','13:00')).toEqual({date:'',time:''});
});
it('requires six PIN digits and displays preparation once without repeating fasting',()=>{
 expect(validHomePin('500081')).toBe(true);expect(validHomePin('50008')).toBe(false);expect(validHomePin('50008x')).toBe(false);
 expect(preparationText({patient_instructions:'Fast 8 hours; water allowed.',fasting_hours:8})).toBe('Fast 8 hours; water allowed.');expect(preparationText({fasting_hours:8})).toBe('Fasting 8 hours needed');expect(preparationText({fasting_hours:0})).toBeNull();
 expect(centreLocality('Vijaya Diagnostics',{name:'Vijaya Diagnostics Banjara Hills',city:'Hyderabad'})).toBe('Banjara Hills, Hyderabad');
});
it('renders actual slots, prices and instructions without marketing or missing-field filler',()=>{
 const lab:LabHit={id:'a',name:'API lab',locations:[],selected:[{code:'T',name:'API test',price:123}],total:123,tests_offered:1};
 const availability:LabAvailability={timezone:'Asia/Kolkata',visit_type:'LAB_VISIT',location_id:1,capacity:2,bookable:true,slot_minutes:30,lead_minutes:15,max_days:60,days};
 const noop=()=>{};
 const html=renderToStaticMarkup(<LabSchedule lab={lab} centreId={1} onCentre={noop} mode="LAB_VISIT" onMode={noop} tests={[{code:'T',name:'API test',fasting_hours:8,patient_instructions:'Actual instruction'}]} date="2026-10-24" time="" onDate={noop} onTime={noop} onChangeLab={noop} onContinue={noop} availability={availability} loading={false} error={null} onRetry={noop} address="" pincode="" addressReady={true} addressFields={null} testsTotal={123} total={123} busy={false}/>);
 expect(html).toContain('Full');expect(html).toContain('2 left');expect(html).toContain('All times in IST');expect(html).toContain('Actual instruction');expect(html).not.toContain('Fasting 8 hours needed');expect(html).not.toContain('What to do next');expect(html).not.toContain('NABL');
});

it('keeps calendar dates outside the API 60-day window disabled',()=>{
 const window=Array.from({length:61},(_,i)=>({date:new Date(Date.UTC(2026,9,24+i)).toISOString().slice(0,10),weekday:0,open:true,slots:[{time:'09:00',available:true,left:null}]}));
 const available=['2026-10','2026-11','2026-12'].flatMap(month=>calendarCells(month,window)).filter(c=>c?.available);
 expect(available).toHaveLength(61);expect(available[0]?.date).toBe('2026-10-24');expect(available[60]?.date).toBe(window[60].date);
 expect(centreLocality('Medicare Diagnostics',{name:'Medicare Madhapur',city:'Hyderabad'})).toBe('Madhapur, Hyderabad');
});
