import {paymentMethodLabel,shortOrderId} from '../../../utils/paymentLabels';
import ProviderImage, {type ProviderImageType} from './ProviderImage';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, CalendarDays, ClipboardList, Clock3, CreditCard, FlaskConical, Home, MapPin, Pill, ShieldCheck, Star, Stethoscope, FileText, Navigation, BadgeInfo } from 'lucide-react';
import { labPublicApi, labReceiptApi, type LabPublic } from '../../../services/labHelper';
import { getPharmacyCatalogueApi } from '../../../services/pharmacyOrderHelper';
import { usePharmacyBaskets } from '../../../services/PharmacyBasketContext';
import { addBasketMedicine } from '../pharmacy/medicineBasket';
import { labDocumentLabel, receiptFilename, saveLabDocumentFile as saveConfirmationFile } from '../labs/labConfirmationDetails';
import { getPharmacyRequestsApi } from '../../../services/pharmacyOrderHelper';
import { formatDoctorName } from '../../../utils/doctorLabel';
import { addressOf, canCancel, canReschedule, dateLabel, dateOf, permissionsOf, placeOf, refOf, statusText, timeRange, typeOf, type Booking } from './bookingsPresentation';

function WheelchairIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13" cy="3" r="1.5" fill="currentColor"/><path d="M13 6v7h6l2 6M13 9h5M9 8a7 7 0 1 0 7 11"/></svg>; }
export function KindIcon({ booking }: { booking: Booking }) {
  const type = typeOf(booking);
  const [Icon, cls] = type === 'Lab Test' ? [FlaskConical, 'lab'] as const : type === 'Home Care' ? [Home, 'care'] as const : type === 'Hospital' ? [Building2, 'hospital'] as const : type === 'Pharmacy' ? [Pill, 'pharmacy'] as const : type === 'Equipment' ? [WheelchairIcon, 'equipment'] as const : [Stethoscope, 'doctor'] as const;
  return <span aria-hidden="true" className={`bk-kind bk-${cls}`}><Icon /></span>;
}
export function Status({ booking }: { booking: Booking }) {
  return <span className={`bk-status bk-${booking.section}`}>{statusText(booking)}</span>;
}
const money = (value: number | string | null | undefined) => value != null && Number.isFinite(Number(value)) ? `Rs. ${Number(value).toFixed(2)}` : null;
export function paymentOf(b: Booking) {
  if (!b.pharmacy && !b.rental && !b.labOrder && !b.homeCare) {
    return b.provider?.payment ? { paid: true, text: `Paid (${money(b.provider.payment.amount)})` } : { paid: false, text: 'To be paid at clinic' };
  }
  const status = b.pharmacy?.payment_status || b.rental?.delivery_address?.settlement?.payment_status || b.rental?.payment_status || b.rental?.delivery_address?.payment_status || b.provider?.payment_status || b.lab?.payment_status || b.care?.payment_status || b.paymentStatus;
  const amount = b.pharmacy?.total_amount ?? b.rental?.total_amount ?? b.provider?.total_amount ?? b.lab?.total_amount ?? b.care?.total_amount ?? b.totalAmount;
  if (status === 'PAID') return { paid: true, text: money(amount) ? `Paid (${money(amount)})` : 'Paid' };
  if (status && !['PENDING','UNPAID'].includes(status)) return { paid: false, text: status.replaceAll('_', ' ').toLowerCase() };
  return { paid: false, text: b.rental || b.pharmacy?.fulfillment_type === 'DELIVERY' ? 'To be paid on delivery' : b.pharmacy ? 'To be paid at pharmacy' : b.homeCare ? 'To be paid after visit' : 'To be paid at centre' };
}
function Fact({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  if (children == null || children === '') return null;
  return <div className="bk-fact">{icon}<span>{label}</span><div>{children}</div></div>;
}
/** Documents contain only the patient-owned API response. Text nodes prevent HTML injection. */
export function printBookingDocument(b: Booking) {
  const invoice = !!b.pharmacy, payment = b.provider?.payment, slip = !invoice && !payment;
  const documentName = invoice ? 'Invoice' : slip ? 'Booking slip' : 'Receipt';
  const popup = window.open('', '_blank');
  if (!popup) throw new Error('Allow pop-ups to view this document.');
  const doc = popup.document;
  doc.title = `Vizito ${documentName.toLowerCase()} — ${refOf(b) || b.id}`;
  const style = doc.createElement('style');
  style.textContent = 'body{font:14px Arial,sans-serif;max-width:760px;margin:48px auto;color:#071252;padding:20px}h1{font-size:24px}dl{display:grid;grid-template-columns:180px 1fr;gap:12px}dd{margin:0}table{width:100%;border-collapse:collapse;margin:24px 0}td,th{padding:10px;text-align:left;border-bottom:1px solid #ddd}button{padding:10px 20px} @media print{button{display:none}}';
  doc.head.append(style);
  const heading = doc.createElement('h1'); heading.textContent = `Vizito ${documentName}`; doc.body.append(heading);
  const rows: [string, unknown][] = invoice ? [
    ['Order ID', shortOrderId(b.pharmacy!.id)], ['Pharmacy', b.pharmacyProvider?.business_name], ['Order date', dateLabel(dateOf(b))], ['Delivery address', b.deliveryAddress], ['Amount', money(b.pharmacy!.total_amount)], ['Payment status', b.pharmacy!.payment_status], ['Payment mode', paymentMethodLabel(b.pharmacy!.payment_method)], 
  ] : [
    ['Receipt number', payment?.receipt_number], ['Booking ID', refOf(b)], ['Doctor', b.provider?.doctor?.name || b.doctorName], ['Hospital / clinic', b.provider?.place?.name || b.business?.name], ['Address', addressOf(b)], ['Visit date', dateLabel(dateOf(b))], ['Visit time', timeRange(b)], ['Amount', money(payment?.amount ?? b.totalAmount)], ['Patient', b.patientName], ['Payment status', payment ? 'Paid' : /refund|waiv/i.test(b.paymentStatus||'') ? b.paymentStatus : 'Pay at clinic'], ['Payment mode', payment?.method ? paymentMethodLabel(payment.method) : null], ['Paid at', payment?.paid_at ? new Date(payment.paid_at).toLocaleString('en-IN', {timeZone:'Asia/Kolkata'}) : null], ['Transaction ID', payment?.transaction_number], 
  ];
  const dl = doc.createElement('dl');
  rows.forEach(([label, value]) => { if (value == null || value === '') return; const dt=doc.createElement('dt'),dd=doc.createElement('dd');dt.textContent=label;dd.textContent=String(value);dl.append(dt,dd); });doc.body.append(dl);
  if (invoice) { const table=doc.createElement('table');const head=table.createTHead().insertRow();['Item','Quantity','Unit price','Subtotal'].forEach(v=>{const th=doc.createElement('th');th.textContent=v;head.append(th);});const body=table.createTBody();b.pharmacy!.items.forEach(item=>{const tr=body.insertRow();[item.medicine?.medicine_name || item.medicine_id,String(item.quantity),money(item.unit_price),money(item.subtotal)].forEach(v=>{tr.insertCell().textContent=v;});});doc.body.append(table); }
  const print=doc.createElement('button');print.textContent='Print';print.onclick=()=>popup.print();doc.body.append(print);doc.close();
}
export default function BookingDetailsContent({ booking: b, hideActions, onReschedule, onCancel, onError, children }: { booking: Booking; hideActions: boolean; onReschedule: () => void; onCancel: () => void; onError: (text: string) => void; children?: ReactNode }) {
  const type = typeOf(b), doctor = type === 'Doctor', hospital = type === 'Hospital', pharmacy = !!b.pharmacy;
  const navigate = useNavigate(), baskets = usePharmacyBaskets();
  const [instructions, setInstructions] = useState(false), [prep, setPrep] = useState<LabPublic | null>(null), [prepBusy, setPrepBusy] = useState(false), [prepError, setPrepError] = useState(''), [ordering, setOrdering] = useState(false), [documentBusy,setDocumentBusy] = useState(false);
  const provider = b.provider, place = provider?.place, payment = paymentOf(b), permissions = permissionsOf(b);
  const doctorName = formatDoctorName(provider?.doctor?.name || b.doctorName);
  const name = doctor ? doctorName : hospital ? b.business?.name : pharmacy ? b.pharmacyProvider?.business_name : b.rental ? b.rental.product?.name : b.homeCare ? b.homeCare.service_name : b.labOrder?.lab_name;
  const image = doctor ? provider?.doctor?.photo_url : pharmacy ? b.pharmacyProvider?.image_url : b.rental ? b.rental.product?.primary_image_url : provider?.image_url;
  const tests = provider?.items || b.lab?.items.filter(i => i.status !== 'CANCELLED').map(i => ({ name: i.test_name, price: i.price }));
  const items = b.pharmacy?.items;
  const total = b.pharmacy?.total_amount ?? provider?.total_amount ?? b.lab?.total_amount;
  const prepCodes = b.lab?.items.map(i => i.test_code) || [];
  const openInstructions = async () => {
    setInstructions(v => !v);
    const lab = b.lab;
    if (!b.labOrder || instructions || prep || !lab || !('lab_partner_id' in lab) || !lab.lab_partner_id) return;
    setPrepBusy(true);setPrepError('');
    try { setPrep(await labPublicApi(lab.lab_partner_id)); } catch { setPrepError('Could not load preparation instructions. Close and try again.'); } finally {setPrepBusy(false);}
  };
  const orderAgain = async () => {
    if (!b.pharmacy || ordering || baskets.loading || baskets.saving) return;
    setOrdering(true);
    try {
      if (b.pharmacy.items.some(item => item.medicine?.requires_prescription)) {
        const requests = await getPharmacyRequestsApi();
        const prescription = requests.find(r => r.id === b.pharmacy!.pharmacy_request_id)?.prescription_id;
        navigate(prescription ? `/my-records?resend=${encodeURIComponent(prescription)}` : '/my-records');
        return;
      }
      if (baskets.error) throw new Error(baskets.error);
      let lines = [...(baskets.baskets[b.pharmacy.pharmacy_partner_id]?.lines || [])];
      // Resolve each line against today's real catalogue, never reuse a historic price as today's MRP.
      for (const item of b.pharmacy.items) {
        if (!item.medicine) throw new Error('An item is no longer in the catalogue. Choose medicines from the pharmacy.');
        let page = 1, seen = 0, match;
        do {
          const result = await getPharmacyCatalogueApi(b.pharmacy.pharmacy_partner_id, item.medicine.medicine_name, page);
          match = result.items.find(m => m.id === item.medicine_id);
          seen += result.items.length;
          if (match || !result.items.length || seen >= result.total) break;
          page++;
        } while (true);
        if (!match) throw new Error(`${item.medicine.medicine_name} is no longer available from this pharmacy.`);
        const added = addBasketMedicine(lines, match, item.quantity);
        if (added.error) throw new Error(`${item.medicine.medicine_name}: ${added.error}`);
        lines = added.lines;
      }
      if (!baskets.update(b.pharmacy.pharmacy_partner_id, lines)) throw new Error('Could not update the basket. Reload saved baskets and try again.');
      await baskets.flush();
      if (!baskets.isPersisted(b.pharmacy.pharmacy_partner_id)) throw new Error('The basket could not be saved. Reload saved baskets and try again.');
      navigate(`/pharmacy-orders/new?pharmacy=${encodeURIComponent(b.pharmacy.pharmacy_partner_id)}`);
    } catch (error) {onError(error instanceof Error ? error.message : 'Could not add these items to your basket.');} finally {setOrdering(false);}
  };
  const directions = () => {
    const dest = place?.pin_confirmed && place.latitude != null && place.longitude != null ? `${place.latitude},${place.longitude}` : [place?.name || placeOf(b), addressOf(b)].filter(Boolean).join(', ');
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
  };
  const prepTexts = Array.from(new Set(prep?.tests?.filter(t => prepCodes.includes(t.code)).flatMap(t => [t.instructions, t.fasting_hours > 0 ? `Fast for ${t.fasting_hours} hours before this test.` : null]).filter((v): v is string => !!v) || []));
  return <>
    <div className="bk-detail-type"><KindIcon booking={b}/><h3>{({Doctor:'Doctor appointment', 'Lab Test':'Lab test booking','Home Care':'Home care visit',Hospital:'Hospital appointment',Pharmacy:'Pharmacy order',Equipment:'Equipment rental'})[type]}</h3><Status booking={b}/></div>
    <div className="bk-provider-block"><ProviderImage category={type==='Equipment'?b.rental?.category:undefined} url={image} name={name} type={({Doctor:'doctor','Lab Test':'lab','Home Care':'homecare',Hospital:'hospital',Pharmacy:'pharmacy',Equipment:'equipment'} as Record<string,ProviderImageType>)[type]}/><div><h3>{name}</h3>
      {doctor && provider?.doctor?.speciality && <p>{provider.doctor.speciality}</p>}
      {doctor && provider?.doctor?.rating != null && <p className="bk-rating"><Star fill="#ff6a00" stroke="#ff6a00"/>{Number(provider.doctor.rating).toFixed(1)}{provider.doctor.review_count != null && ` (${provider.doctor.review_count} reviews)`}</p>}
      {hospital && b.business?.type && <p>{b.business.type}</p>}
      {b.labOrder && provider?.nabl?.current && <span className="bk-accredited"><ShieldCheck/>NABL accredited</span>}
      {pharmacy && b.pharmacy?.status === 'COMPLETED' && <span className="bk-accredited"><ShieldCheck/>Order delivered</span>}
      {doctor && (place?.name || placeOf(b)) && <p className="bk-clinic"><Building2/>{place?.name || placeOf(b)}</p>}
      {!b.homeCare && addressOf(b) && <p className="bk-provider-address"><MapPin/>{pharmacy ? b.pharmacyProvider?.pharmacy?.address : addressOf(b)}</p>}
    </div></div>
    {tests && <div className="bk-item-table"><h4>Tests ({tests.length})</h4><table><tbody>{tests.map((t,i)=><tr key={`${t.name}-${i}`}><td><i>{i+1}</i>{t.name}</td><td>{money(t.price)}</td></tr>)}</tbody></table>{total != null && <div className="bk-total"><strong>Total</strong><strong>{money(total)}</strong></div>}</div>}
    {items && <div className="bk-item-table"><h4>Items ({items.length})</h4><table><tbody>{items.map((item,i)=><tr key={item.id}><td><i>{i+1}</i>{item.medicine?.medicine_name || item.medicine_id}</td><td>{item.quantity}</td><td>{money(item.subtotal)}</td></tr>)}</tbody></table><div className="bk-total"><strong>Total</strong><strong>{money(total)}</strong></div></div>}
    {b.homeCare && <div className="bk-service-facts"><h4>Service details</h4><Fact icon={<Stethoscope/>} label="Service type">{b.homeCare.service_name}</Fact><Fact icon={<Clock3/>} label="Duration">{(provider?.duration_minutes ?? b.care?.duration_minutes) != null ? ((provider?.duration_minutes ?? b.care?.duration_minutes)! % 60 === 0 ? `${(provider?.duration_minutes ?? b.care?.duration_minutes)! / 60} ${(provider?.duration_minutes ?? b.care?.duration_minutes) === 60 ? 'hour' : 'hours'}` : `${provider?.duration_minutes ?? b.care?.duration_minutes} minutes`) : null}</Fact><Fact icon={<MapPin/>} label="Address">{addressOf(b)}</Fact></div>}
    <div className="bk-new-facts">
      {hospital && <><Fact icon={<Building2/>} label="Department">{b.department}</Fact><Fact icon={<Stethoscope/>} label="Doctor">{doctorName}</Fact></>}
      <Fact icon={<CalendarDays/>} label={pharmacy ? 'Order date' : b.rental ? 'Rental dates' : 'Date & time'}>{b.rental ? <>{dateLabel(b.rental.start_date)}<br/>– {dateLabel(b.rental.end_date)}</> : <>{dateLabel(dateOf(b))}{timeRange(b) && <><br/>{timeRange(b)}</>}</>}</Fact>
      {doctor && <Fact icon={<ClipboardList/>} label="Consultation type">{b.appointmentType === 'VIDEO_CALL' ? 'Video consultation' : b.appointmentType === 'HOME_VISIT' ? 'Home visit' : b.appointmentType ? 'In-clinic visit' : null}</Fact>}
      {b.labOrder && <Fact icon={<ClipboardList/>} label="Collection type">{b.labOrder.visit_type === 'HOME' ? 'Home collection' : 'Visit centre'}</Fact>}
      <Fact icon={<ClipboardList/>} label={pharmacy || b.rental ? 'Order ID' : 'Booking ID'}>{refOf(b)}</Fact>
      {pharmacy && b.pharmacy?.fulfillment_type === 'DELIVERY' && <Fact icon={<MapPin/>} label="Delivery address">{b.deliveryAddress}</Fact>}
      {b.rental && <Fact icon={<MapPin/>} label="Delivery address">{addressOf(b)}</Fact>}
      {b.rental && <Fact icon={<Pill/>} label="Item">{b.rental.product?.name}{b.rental.quantity != null && ` × ${b.rental.quantity}`}</Fact>}
      {b.rental && <Fact icon={<CreditCard/>} label="Total">{money(b.rental.total_amount)}</Fact>}
      <Fact icon={<CreditCard/>} label="Payment status"><span className={`bk-payment ${payment.paid ? 'is-paid' : ''}`}>{payment.text}</span></Fact>
    </div>
    {!hideActions && <>
      <div className="bk-detail-actions">
        {canReschedule(b) && <button className="bk-button" onClick={onReschedule}>Reschedule</button>}
        {canCancel(b) && <button className="bk-button bk-danger" onClick={onCancel}>Cancel</button>}
        {(doctor || hospital) && b.provider?.payment && <button className="bk-button" onClick={()=>{try{printBookingDocument(b);}catch(e){onError((e as Error).message);}}}>View receipt</button>}
        {hospital && b.section === 'completed' && b.providerId && <Link className="bk-button bk-solid-blue" to={`/booking?service=hospital&provider=${encodeURIComponent(b.hospitalPartnerId || b.business?.id || b.providerId)}&doctor=${encodeURIComponent(b.providerId)}${b.department ? `&department=${encodeURIComponent(b.department)}` : ''}${b.facilityId ? `&facility=${b.facilityId}` : ''}`}>Book again</Link>}
        {pharmacy && b.section === 'completed' && <><button className="bk-button" onClick={()=>{try{printBookingDocument(b);}catch(e){onError((e as Error).message);}}}>View invoice</button><button className="bk-button bk-solid-blue" disabled={ordering || baskets.loading || baskets.saving} onClick={()=>void orderAgain()}>{ordering ? 'Adding…' : 'Order again'}</button></>}
      </div>
      {permissions?.can_reschedule === false && permissions.reschedule_unavailable_reason && <p className="bk-unavailable">{permissions.reschedule_unavailable_reason}</p>}
      {permissions?.can_cancel === false && permissions.cancel_unavailable_reason && permissions.cancel_unavailable_reason !== permissions.reschedule_unavailable_reason && <p className="bk-unavailable">{permissions.cancel_unavailable_reason}</p>}
      {doctor && (addressOf(b) || (place?.pin_confirmed && place.latitude != null && place.longitude != null)) && <a className="bk-detail-link" href={directions()} target="_blank" rel="noopener noreferrer"><Navigation/>Get directions</a>}
      {(b.labOrder || b.homeCare) && <><button className="bk-detail-link" aria-expanded={instructions} onClick={()=>void openInstructions()}><BadgeInfo/>{b.labOrder ? 'View preparation instructions' : 'View service instructions'}</button>{instructions && <div className="bk-instructions">{b.labOrder ? prepBusy ? <p role="status">Loading instructions…</p> : prepError ? <p role="alert">{prepError}</p> : prepTexts.length ? prepTexts.map(text=><p key={text}>{text}</p>) : <p>No preparation instructions provided by the lab.</p> : <>{b.care?.care_needs && <p>{b.care.care_needs}</p>}{b.care?.referral?.instructions && <p>{b.care.referral.instructions}</p>}{!b.care?.care_needs && !b.care?.referral?.instructions && <p>No service instructions provided.</p>}</>}</div>}</>}
      {b.labOrder && <button className="bk-detail-link" disabled={documentBusy} onClick={()=>{setDocumentBusy(true);void labReceiptApi(b.labOrder!.id).then(file=>saveConfirmationFile(file.blob,receiptFilename(file.disposition,b.labOrder!.order_number,b.lab?.payment_status || b.provider?.payment_status || b.paymentStatus))).catch(()=>onError('Could not download this document. Please try again.')).finally(()=>setDocumentBusy(false));}}><FileText/>{documentBusy ? 'Downloading…' : labDocumentLabel(b.lab?.payment_status || b.provider?.payment_status || b.paymentStatus)}</button>}
      {children}
    </>}
  </>;
}
