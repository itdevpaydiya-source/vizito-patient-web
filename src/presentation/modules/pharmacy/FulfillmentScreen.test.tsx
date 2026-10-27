import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { isValidElement, type ReactNode } from 'react';
import FulfillmentScreen, { FulfillmentSteps } from './FulfillmentScreen';
import type { PatientAddress } from '../../../services/patientHelper';
import type { BasketLine } from './medicineBasket';
const line = { medicine: { id: 'm1', medicine_name: 'Test tablet', mrp: 12.5, requires_prescription: false }, quantity: 2 } as BasketLine;
const props = () => ({fulfillmentType:'PICKUP' as 'PICKUP'|'DELIVERY',onFulfillment:vi.fn(),addresses:[] as PatientAddress[],deliveryAddressId:'',onAddress:vi.fn(),payChoice:'CASH' as 'CASH'|'ONLINE',onPayment:vi.fn(),canSubmit:true,onSubmit:vi.fn(),pharmacy:null,lines:[line],busy:false,onEdit:vi.fn(),onChange:vi.fn(),onBack:vi.fn(),onPrescription:vi.fn()});
const render = (p = props()) => renderToStaticMarkup(<FulfillmentScreen {...p}/>);
function elements(node:ReactNode):any[]{if(Array.isArray(node))return node.flatMap(elements);if(!isValidElement(node))return [];return [node,...elements((node.props as any).children)];}
describe('fulfillment',()=>{
 it('uses basket totals and renders one summary',()=>{const html=render();expect(html).toContain('INR 25.00');expect(html).toContain('Subtotal (2 units)');expect(html.match(/aria-label="Fulfillment order summary"/g)).toHaveLength(1);});
 it('enables backend-supported choices and passes selections to existing state',()=>{const p=props();const buttons=elements(FulfillmentScreen(p)).filter(e=>e.type==='button');expect(buttons.filter(e=>e.props.disabled)).toHaveLength(0);buttons.find(e=>e.props['aria-pressed']===false&&elements(e).some(c=>c.props.children==='Home delivery')).props.onClick();expect(p.onFulfillment).toHaveBeenCalledWith('DELIVERY');expect(render()).not.toContain('cannot continue');});
 it('honors canSubmit and offers the existing address screen for delivery',()=>{const p={...props(),fulfillmentType:'DELIVERY' as const,canSubmit:false};const html=render(p);expect(html).toContain('Add an address');expect(html).toContain('/profile?section=addresses');expect(elements(FulfillmentScreen(p)).find(e=>e.type==='button'&&elements(e).some(c=>c.props.className==='h-4 w-4')).props.disabled).toBe(true);});
 it('renders only supplied addresses and forwards address/payment/submit actions',()=>{
  const p={...props(),fulfillmentType:'DELIVERY' as const,deliveryAddressId:'a1',addresses:[{addressId:'a1',label:'Home',addressLine1:'Actual saved street',pincode:'500081'} as PatientAddress]};
  const nodes=elements(FulfillmentScreen(p));expect(render(p)).toContain('Actual saved street');
  const address=nodes.find(e=>e.type==='input'&&e.props.name==='delivery-address');expect(address.props.checked).toBe(true);address.props.onChange();expect(p.onAddress).toHaveBeenCalledWith('a1');
  nodes.find(e=>e.type==='button'&&elements(e).some(c=>c.props.children==='Pay online')).props.onClick();expect(p.onPayment).toHaveBeenCalledWith('ONLINE');
  nodes.find(e=>e.type==='button'&&Array.isArray(e.props.children)&&e.props.children[0]==='Place order').props.onClick();expect(p.onSubmit).toHaveBeenCalledOnce();
 });
 it('never substitutes missing/zero prices or fees',()=>{for(const mrp of [0,NaN]){const p=props();p.lines=[{...line,medicine:{...line.medicine,mrp}}];expect(render(p)).not.toContain('INR');expect(render(p)).toContain('Price not provided');}expect(render()).toContain('No fee added');expect(render()).toContain('Order total');});
 it('blocks Rx with a single prescription action',()=>{const p=props();p.lines=[{...line,medicine:{...line.medicine,requires_prescription:true}}];expect(render(p)).toContain('No accepted prescription');expect(render(p).match(/Send prescription instead/g)).toHaveLength(1);elements(FulfillmentScreen(p)).find(e=>e.type==='button'&&e.props.children==='Send prescription instead').props.onClick();expect(p.onPrescription).toHaveBeenCalledOnce();});
 it('preserves parent navigation callbacks',()=>{const p=props();const buttons=elements(FulfillmentScreen(p)).filter(e=>e.type==='button');for(const [label,handler] of [['Edit basket',p.onEdit],['Change pharmacy',p.onChange],['Back to review order',p.onBack]] as const){buttons.find(e=>e.props.children===label).props.onClick();expect(handler).toHaveBeenCalledOnce();}});
 it('exposes save/errors and empty state',()=>{const p={...props(),lines:[],busy:true,error:'Save failed'};const html=render(p);expect(html).toContain('Save failed');expect(html).toContain('Saving basket');expect(html).toContain('Your basket is empty');expect(html).not.toContain('INR');});
 it('labels submission by payment choice without changing the callback',()=>{
  expect(render()).toContain('Place order');
  const p={...props(),payChoice:'ONLINE' as const};expect(render(p)).toContain('Place order &amp; pay');
  elements(FulfillmentScreen(p)).find(e=>e.type==='button'&&e.props.children[0]==='Place order & pay').props.onClick();expect(p.onSubmit).toHaveBeenCalledOnce();
 });
 it('describes options from current pharmacy, hours, addresses and fulfillment type',()=>{
  const p={...props(),pharmacy:{id:'p1',name:'Pharmacy',address:'12 Actual Road',businessHours:[{day:new Intl.DateTimeFormat('en-US',{weekday:'long'}).format(new Date()),open_time:'09:00',close_time:'22:00',is_closed:false}]} as any};
  const html=render(p);expect(html).toContain('Collect from 12 Actual Road');expect(html).toContain('Open today 9:00 AM');expect(html).toContain('Add an address to use delivery');expect(html).toContain('Pay the pharmacy when you collect');expect(html).toContain('UPI, card, net banking or wallet');expect(html).not.toContain('min-h-28');
  expect(render({...props(),fulfillmentType:'DELIVERY',addresses:[{addressId:'a1'} as PatientAddress]})).toContain('Delivered to your saved address');
  expect(render({...props(),fulfillmentType:'DELIVERY'})).toContain('Pay the pharmacy when you receive');expect(render()).toContain('Hours not provided');
 });
 it('explains each disabled state beneath the primary button',()=>{
  const cases=[{...props(),lines:[],canSubmit:false},{...props(),lines:[{...line,medicine:{...line.medicine,requires_prescription:true}}],canSubmit:false},{...props(),fulfillmentType:'DELIVERY' as const,canSubmit:false},{...props(),busy:true,canSubmit:false},{...props(),error:'Save failed',canSubmit:false}];
  const reasons=['Your basket is empty. Add a medicine','Prescription medicines need an accepted prescription','Select a delivery address','Your basket is saving','Your basket could not be saved'];
  cases.forEach((p,index)=>{const nodes=elements(FulfillmentScreen(p));const reason=nodes.find(e=>e.props.id==='place-order-disabled-reason');expect(reason.props.children).toContain(reasons[index]);const button=nodes.find(e=>e.type==='button'&&e.props['aria-describedby']==='place-order-disabled-reason');expect(button.props.disabled).toBe(true);});
  expect(render()).not.toContain('place-order-disabled-reason');
 });
 it('marks step four as current',()=>{expect(renderToStaticMarkup(<FulfillmentSteps/>)).toContain('aria-current="step"');});
});

it('keeps fulfillment progress in a responsive five-step grid',()=>{const html=renderToStaticMarkup(<FulfillmentSteps/>);expect(html).toContain('grid-cols-3');expect(html).toContain('sm:grid-cols-5');expect(html.match(/<li /g)).toHaveLength(5);expect(html.match(/aria-current="step"/g)).toHaveLength(1);});
