import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import ResumeOrderCard from './ResumeOrderCard';
import type {SavedPharmacyBasket} from '../../../services/PharmacyBasketContext';
const basket:SavedPharmacyBasket={pharmacyId:'p1',pharmacyName:'Existing pharmacy',version:1,lines:[{quantity:2,medicine:{id:'m1',medicine_name:'Existing tablet',strength:'10',strength_unit:'mg',dosage_form:'Tablet',mrp:12.5,requires_prescription:false} as any}]};
const render=(value=basket,persisted=true)=>renderToStaticMarkup(<ResumeOrderCard basket={value} persisted={persisted} disabled={false} onResume={()=>{}} onDiscard={()=>true}/>);
describe('resume order card',()=>{
 it('shows real first medicine details, separate counts and reliable subtotal',()=>{
  const html=render();for(const value of ['Existing pharmacy','Existing tablet','10 mg','Tablet','INR 25.00','Your saved order','Resume order','Discard order'])expect(html).toContain(value);
  expect(html).not.toContain('+1 more');
 });
 it('uses the full basket for quantities and subtotal in a multi-medicine draft',()=>{
  const html=render({...basket,lines:[...basket.lines,{quantity:3,medicine:{...basket.lines[0].medicine,id:'m2',mrp:8}}]});
  expect(html).toContain('INR 49.00');expect(html).toContain('+1 more');expect(html).toContain('medicines');
 });
 it('never fabricates a total for missing or zero prices',()=>{
  for(const mrp of [NaN,0]){const html=render({...basket,lines:[{...basket.lines[0],medicine:{...basket.lines[0].medicine,mrp}}]});expect(html).toContain('Total will be confirmed by the pharmacy');expect(html).not.toContain('INR');}
 });
 it('does not label active changes as saved',()=>{const html=render(basket,false);expect(html).toContain('Your active order');expect(html).not.toContain('Your saved order');});
 it('renders no draft card for an empty basket',()=>{expect(render({...basket,lines:[]})).toBe('');});
});
