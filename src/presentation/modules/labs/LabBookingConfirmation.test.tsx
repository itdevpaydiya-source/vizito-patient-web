import {expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {buildLabIcs,calendarEscape,confirmationPayment,confirmationPerson,confirmationTimeline,googleCalendarUrl,receiptFilename,labDocumentLabel} from './labConfirmationDetails';
import {ConfirmationVisitCode} from './LabBookingConfirmation';
import {preparationText} from './labScheduleDetails';
import type {LabConfirmationOrder} from '../../../services/labHelper';
it('exports IST wall time correctly as UTC and escapes/folds iCalendar text safely',()=>{
 const data={id:'order-id',date:'2026-10-25',time:'16:00',minutes:30,lab:'Lab, A; B\\C\nnext',address:'Street; 1, Hyderabad',number:'API-123'};
 const ics=buildLabIcs(data,new Date('2026-10-24T00:00:00Z'));
 expect(ics).toContain('DTSTART:20261025T103000Z\r\nDTEND:20261025T110000Z');expect(ics).toContain('Lab\\, A\\; B\\\\C\\nnext');expect(ics).toContain('LOCATION:Street\\; 1\\, Hyderabad');expect(ics).toContain('UID:order-id@vizito');expect(ics.endsWith('\r\n')).toBe(true);
 const long=buildLabIcs({...data,lab:'ల్యాబ్'.repeat(80)});expect(long.split('\r\n').every(line=>new TextEncoder().encode(line).length<=75)).toBe(true);
 const url=new URL(googleCalendarUrl(data));expect(url.searchParams.get('dates')).toBe('20261025T103000Z/20261025T110000Z');expect(url.searchParams.get('ctz')).toBe('Asia/Kolkata');
 expect(calendarEscape('a\r\nb')).toBe('a\\nb');
});
it('does not fabricate a duration when calendar data is missing',()=>{
 expect(()=>buildLabIcs({id:'id',date:'bad',time:'16:00',minutes:30})).toThrow();expect(()=>buildLabIcs({id:'id',date:'2026-10-25',time:'16:00',minutes:0})).toThrow();
});
it('uses confirmed payment states and the real collection method',()=>{
 expect(confirmationPayment({payment_status:'PAID',payment_mode:'UPI',visit_type:'LAB_VISIT'})).toEqual({totalLabel:'Total paid',label:'Paid online'});
 expect(confirmationPayment({payment_status:'PENDING',payment_mode:'CASH',visit_type:'LAB_VISIT'}).label).toBe('To pay at the centre');expect(confirmationPayment({payment_status:'PENDING',payment_mode:'CASH',visit_type:'HOME'}).label).toBe('To pay the collector');
 expect(confirmationPayment({payment_status:'PENDING',payment_mode:'UPI',visit_type:'LAB_VISIT'}).label).toBe('Payment pending');
 expect(confirmationPayment({payment_status:'REFUNDED',payment_mode:'UPI',visit_type:'LAB_VISIT'}).label).toBe('Refunded');expect(confirmationPayment({payment_status:'PAID',payment_mode:'CASH',visit_type:'LAB_VISIT'}).label).not.toBe('Paid online');
});
it('shows the supplied home visit code, never a fabricated one',()=>{
 const html=renderToStaticMarkup(<ConfirmationVisitCode code="184729"/>);expect(html).toContain('184729');expect(html).toContain('Give this code only to the collector when they arrive.');expect(renderToStaticMarkup(<ConfirmationVisitCode/>)).toBe('');
});
it('has one preparation line and a fasting reminder only when needed',()=>{
 expect(preparationText({patient_instructions:'Water is allowed; fast for 8 hours.',fasting_hours:8})).toBe('Water is allowed; fast for 8 hours.');expect(preparationText({fasting_hours:8})).toBe('Fasting 8 hours needed');
 expect(confirmationTimeline(false,false)).toHaveLength(2);expect(confirmationTimeline(false,true,'2026-10-24','2026-10-24')).toHaveLength(2);expect(confirmationTimeline(true,true)).toHaveLength(3);expect(confirmationTimeline(true,false)[0]).toContain('collector');expect(confirmationTimeline(false,true)[1]).toContain('evening before');expect(confirmationTimeline(false,false).join(' ')).not.toMatch(/email|SMS/);
});
it('keeps the booked patient distinct from the account owner',()=>{
 const order={patient_profile_id:'family-id',patient_name:'API family patient',patient_phone:'12345'} as LabConfirmationOrder;
 const profile={patientProfileId:'owner-id',email:'owner@example.test'} as any;
 expect(confirmationPerson(order,profile,[]).email).toBeUndefined();expect(confirmationPerson(order,profile,[]).name).toBe('API family patient');
 expect(confirmationPerson({...order,patient_profile_id:'owner-id'},profile,[]).email).toBe('owner@example.test');
});
it('reads and sanitizes receipt filenames from the real disposition header',()=>{
 expect(receiptFilename('attachment; filename="VIZITO-receipt-API.pdf"')).toBe('VIZITO-receipt-API.pdf');expect(receiptFilename("attachment; filename*=UTF-8''VIZITO%20receipt.pdf")).toBe('VIZITO receipt.pdf');expect(receiptFilename('attachment; filename="../receipt.pdf"')).not.toContain('/');
});

it('labels and names unpaid documents as booking slips and paid/refunded documents as receipts',()=>{
 expect(labDocumentLabel('PENDING')).toBe('Download booking slip');
 expect(labDocumentLabel(null)).toBe('Download booking slip');
 expect(labDocumentLabel('PAID')).toBe('Download receipt');
 expect(labDocumentLabel('REFUNDED')).toBe('Download receipt');
 expect(receiptFilename(null,'ACTUAL-ORDER','PENDING')).toBe('VIZITO-booking-slip-ACTUAL-ORDER.pdf');
 expect(receiptFilename(null,'ACTUAL-ORDER',null)).toBe('VIZITO-booking-slip-ACTUAL-ORDER.pdf');
 expect(receiptFilename(null,'ACTUAL-ORDER','PAID')).toBe('VIZITO-receipt-ACTUAL-ORDER.pdf');
 expect(receiptFilename('attachment; filename="VIZITO-booking-slip-API.pdf"','ACTUAL-ORDER','PENDING')).toBe('VIZITO-booking-slip-API.pdf');
});
