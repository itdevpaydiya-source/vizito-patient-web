import {afterEach,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import LabReview,{LabReviewPaymentNote,type LabReviewProps} from './LabReview';
import {appointmentRange,relativeAppointmentDay,reviewButtonLabel,reviewDisabledReason,reviewPaymentOptions} from './labReviewDetails';
const noop=()=>{};
const props:LabReviewProps={lab:{id:'a',name:'API diagnostic lab',locations:[{id:1,name:'API centre',address:'API address',city:null,pincode:null,phone:null}],selected:[{code:'T',name:'API test',price:123}],total:123,tests_offered:1},centreId:1,items:[{code:'T',name:'API test',price:123}],preparationTests:[{code:'T',name:'API test',fasting_hours:8,patient_instructions:'Fast for 8 hours; water is allowed.'}],date:'2026-10-25',time:'16:00',slotMinutes:30,visit:'LAB_VISIT',address:'',patient:null,patientLoading:false,patientError:null,onRetryPatient:noop,family:[],forWho:'',onPatient:noop,testsTotal:123,total:123,pay:'CASH',onPay:noop,upi:'',onUpi:noop,onEdit:noop,onBook:noop,disabledReason:null,busy:false,error:null};
afterEach(()=>vi.unstubAllEnvs());
it('renders preparation exactly once and omits instructions when no data is supplied',()=>{
 const html=renderToStaticMarkup(<LabReview {...props}/>);
 expect(html.split('Fast for 8 hours; water is allowed.')).toHaveLength(2);expect(html).not.toContain('Fasting 8 hours needed');expect(html).not.toContain('10–12');
 const absent=renderToStaticMarkup(<LabReview {...props} preparationTests={[]}/>);expect(absent).not.toContain('5. Test preparation');
 const fallback=renderToStaticMarkup(<LabReview {...props} preparationTests={[{code:'T',name:'API test',fasting_hours:8,patient_instructions:null}]}/>);expect(fallback).toContain('Fasting 8 hours needed');
});
it('offers only UPI and the correct pay-later choice for each visit type',()=>{
 expect(reviewPaymentOptions('LAB_VISIT').map(p=>p.label)).toEqual(['Pay now (UPI)','Pay at the centre']);expect(reviewPaymentOptions('HOME').map(p=>p.label)).toEqual(['Pay now (UPI)','Pay the collector']);
 const html=renderToStaticMarkup(<LabReview {...props} visit="HOME" homeFee={25} total={148}/>);expect(html).toContain('Pay the collector');expect(html).not.toContain('Pay at the centre');expect(html).not.toContain('Net banking');expect(html).toContain('Home collection fee');
 expect(renderToStaticMarkup(<LabReview {...props} homeFee={25}/>)).not.toContain('Home collection fee');
});
it('cannot render a simulation note in production',()=>{
 vi.stubEnv('PROD',true);expect(renderToStaticMarkup(<LabReviewPaymentNote/>)).toBe('');expect(renderToStaticMarkup(<LabReview {...props} pay="UPI"/>)).not.toContain('Test mode');
 vi.stubEnv('PROD',false);expect(renderToStaticMarkup(<LabReviewPaymentNote/>)).toContain('Test mode');
});
it('uses actual totals in payment labels and gives required-input reasons',()=>{
 expect(reviewButtonLabel('UPI','LAB_VISIT',123)).toBe('Pay ₹123 and confirm booking');expect(reviewButtonLabel('CASH','LAB_VISIT',123)).toBe('Book visit');expect(reviewButtonLabel('CASH','HOME',148)).toBe('Book home collection');expect(reviewButtonLabel('CASH','HOME',148,true)).toBe('Booking…');
 const input={busy:false,checking:false,slotValid:true,addressReady:true,pay:'UPI' as const,upi:'patient@upi',hasTests:true,hasCentre:true,total:123};
 expect(reviewDisabledReason(input)).toBeNull();expect(reviewDisabledReason({...input,total:undefined})).toContain('payable amount');expect(reviewDisabledReason({...input,upi:''})).toContain('UPI ID');expect(reviewDisabledReason({...input,slotValid:false})).toContain('available appointment');expect(reviewDisabledReason({...input,addressReady:false})).toContain('home collection address');expect(reviewDisabledReason({...input,busy:true})).toContain('processed');
 const html=renderToStaticMarkup(<LabReview {...props} disabledReason="Choose an available appointment before confirming."/>);expect(html).toContain('disabled=""');expect(html).toContain('Choose an available appointment before confirming.');
});
it('omits missing pharmacy, patient and price elements instead of fabricating values',()=>{
 const html=renderToStaticMarkup(<LabReview {...props} items={[{code:'T',name:'API test'}]} testsTotal={undefined} total={undefined}/>);
 expect(html).not.toContain('Reg. no.');expect(html).not.toContain('<img');expect(html).not.toContain('View on map');expect(html).not.toContain('₹0');expect(html).not.toContain('N/A');expect(html).not.toContain('Guaranteed');expect(html).not.toContain('View full policy');
});
it('formats the appointment range from API slot duration and labels relative IST dates',()=>{
 expect(appointmentRange('16:00',30)).toBe('4:00 PM – 4:30 PM (IST)');expect(appointmentRange('23:30',30)).toBe('11:30 PM – 12:00 AM (IST)');expect(appointmentRange('16:00')).toBe('4:00 PM (IST)');expect(relativeAppointmentDay('2026-10-24','2026-10-24')).toBe('Today');expect(relativeAppointmentDay('2026-10-25','2026-10-24')).toBe('Tomorrow');expect(relativeAppointmentDay('2026-10-26','2026-10-24')).toBeNull();
});
