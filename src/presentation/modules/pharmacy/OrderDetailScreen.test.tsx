import * as orderApi from '../../../services/pharmacyOrderHelper';
import {describe,it,expect,vi,afterEach} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {OrderTimeline,OrderSummaryTable,orderMoney,stepIndex,CANCELLABLE,onlinePaymentNeeded,OrderRefundPolicy,paymentMethodLabel,refundedMessage,cancelledByYouText,startRefundRefresh} from './OrderDetailScreen';
import type {PatientOrder} from '../../../services/types';
const order={id:'o1',status:'CREATED',payment_method:'CASH',fulfillment_type:'PICKUP',total_amount:'27.50',items:[{id:'i1',medicine:{medicine_name:'Actual tablet'},quantity:2,unit_price:'13.75',subtotal:'27.50'}]} as PatientOrder;
describe('order detail presentation',()=>{
 it('maps backend lifecycle to the current timeline step',()=>{for(const [status,index] of [['CREATED',0],['AWAITING_PAYMENT',0],['PAID',1],['PROCESSING',2],['READY_FOR_PICKUP',3],['OUT_FOR_DELIVERY',3],['COMPLETED',4]] as const){expect(stepIndex(status)).toBe(index);const html=renderToStaticMarkup(<OrderTimeline order={{...order,status}}/>);expect(html.match(/aria-current="step"/g)).toHaveLength(1);}for(const status of ['CANCELLED','FULFILLMENT_FAILED'] as const)expect(renderToStaticMarkup(<OrderTimeline order={{...order,status}}/>)).toBe('');});
 it('uses pickup and delivery labels without inventing a current fulfillment status',()=>{const pickup=renderToStaticMarkup(<OrderTimeline order={order}/>);expect(pickup).toContain('Ready to collect');expect(pickup).toContain('Payment');const delivery=renderToStaticMarkup(<OrderTimeline order={{...order,fulfillment_type:'DELIVERY',payment_method:'UPI'}}/>);expect(delivery).toContain('On the way');expect(delivery).toContain('Delivered');});
 it('shows API quantities and stored prices in one semantic table',()=>{const html=renderToStaticMarkup(<OrderSummaryTable order={order} prescription={null}/>);for(const value of ['Actual tablet','Quantity','Unit price','INR 13.75','INR 27.50','<tfoot '])expect(html).toContain(value);expect(html.match(/<table /g)).toHaveLength(1);});
 it('does not turn missing or invalid prices into zero',()=>{for(const value of [null,undefined,'',NaN,-1])expect(orderMoney(value)).toBe('Price not provided');expect(orderMoney('0.00')).toBe('INR 0.00');});
 it('keeps prescription instructions in the order table',()=>{const html=renderToStaticMarkup(<OrderSummaryTable order={order} prescription={{medicines:[{name:'Actual tablet',dosage:'10 mg',frequency:'Once daily',duration:'3 days'}]} as any}/>);for(const value of ['10 mg','Once daily','3 days'])expect(html).toContain(value);});
 it('shows paid only for confirmed payments and offers payment only in payable states',()=>{
  const pending={...order,payment_method:'UPI',payment_status:'PENDING' as const};expect(onlinePaymentNeeded(pending)).toBe(true);expect(renderToStaticMarkup(<OrderTimeline order={pending}/>)).not.toContain('>Paid<');
  const paid={...pending,status:'PAID' as const,payment_status:'PAID' as const};expect(onlinePaymentNeeded(paid)).toBe(false);expect(renderToStaticMarkup(<OrderTimeline order={paid}/>)).toContain('>Paid<');
  for(const status of ['PROCESSING','CANCELLED','COMPLETED'] as const)expect(onlinePaymentNeeded({...pending,status})).toBe(false);
  expect(onlinePaymentNeeded({...pending,payment_status:'REFUND_PENDING'})).toBe(false);
 });
 it('keeps mobile rows and grand total visible without a scrolling container',()=>{const html=renderToStaticMarkup(<OrderSummaryTable order={order} prescription={null}/>);expect(html).toContain('grid-cols-[minmax(0,1fr)_auto]');expect(html).toContain('sm:hidden');expect(html).not.toContain('overflow-x-auto');});
 it('states cancellation/refund rules without timing or transfer promises',()=>{const html=renderToStaticMarkup(<OrderRefundPolicy/>);expect(html).toContain('before the pharmacy starts fulfillment');expect(html).toContain('refund request');for(const claim of ['test mode','working days','shortly','guarantee'])expect(html).not.toContain(claim);});
 it('preserves the existing cancellation status boundary',()=>{expect(CANCELLABLE).toEqual(['CREATED','AWAITING_PAYMENT','PAID']);expect(CANCELLABLE).not.toContain('PROCESSING');});
});

describe('refund refresh and cancellation copy',()=>{
 afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();});
 it('retries a pending refund at 2s intervals and stops after settlement',async()=>{
  vi.useFakeTimers();const read=vi.spyOn(orderApi,'getMyOrderApi').mockResolvedValueOnce({...order,payment_status:'REFUND_PENDING'}).mockResolvedValue({...order,payment_status:'REFUNDED'});const update=vi.fn();const cleanup=startRefundRefresh(order.id,update);
  await vi.advanceTimersByTimeAsync(1999);expect(read).not.toHaveBeenCalled();await vi.advanceTimersByTimeAsync(1);expect(read).toHaveBeenCalledTimes(1);await vi.advanceTimersByTimeAsync(2000);expect(update).toHaveBeenLastCalledWith(expect.objectContaining({payment_status:'REFUNDED'}));await vi.advanceTimersByTimeAsync(10000);expect(read).toHaveBeenCalledTimes(2);cleanup();
 });
 it('limits pending or failed reads to three tries and clears work on navigation',async()=>{
  vi.useFakeTimers();const read=vi.spyOn(orderApi,'getMyOrderApi').mockRejectedValue(new Error('offline'));const update=vi.fn();startRefundRefresh(order.id,update);await vi.advanceTimersByTimeAsync(12000);expect(read).toHaveBeenCalledTimes(3);expect(update).not.toHaveBeenCalled();const cleanup=startRefundRefresh(order.id,update);cleanup();await vi.advanceTimersByTimeAsync(4000);expect(read).toHaveBeenCalledTimes(3);
 });
 it('ignores an in-flight result after cleanup',async()=>{vi.useFakeTimers();let resolve!:(o:PatientOrder)=>void;vi.spyOn(orderApi,'getMyOrderApi').mockImplementation(()=>new Promise(r=>{resolve=r;}));const update=vi.fn();const cleanup=startRefundRefresh(order.id,update);await vi.advanceTimersByTimeAsync(2000);cleanup();resolve({...order,payment_status:'REFUNDED'});await Promise.resolve();expect(update).not.toHaveBeenCalled();});
 it('uses real cancellation actor and timestamp, omitting absent or invalid data',()=>{const cancelled={...order,status:'CANCELLED' as const,patient_id:'p1',cancelled_by:'p1',cancelled_at:'2026-10-23T10:30:00Z'};expect(cancelledByYouText(cancelled)).toContain('Cancelled by you on');for(const o of [{...cancelled,cancelled_at:null},{...cancelled,cancelled_at:'bad'},{...cancelled,cancelled_by:'pharmacy'}])expect(cancelledByYouText(o)).toBeNull();});
 it('formats sentence-case methods and confirmed refund amount without a fake method',()=>{expect(['UPI','CARD','NET_BANKING','WALLET'].map(paymentMethodLabel)).toEqual(['UPI','Card','Net banking','Wallet']);expect(refundedMessage({...order,payment_method:'CARD',payment_status:'REFUNDED'})).toBe('Refunded INR 27.50 to your Card');expect(refundedMessage({...order,payment_method:null})).toBe('Refunded INR 27.50');});
});
