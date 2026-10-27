import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import BasketDrawer from './BasketDrawer';
import type { MedicineSearchResult } from '../../../services/pharmacyOrderHelper';
const medicine = {id:'1',medicine_name:'Test tablet',strength:'500',strength_unit:'mg',dosage_form:'Tablet',packaging_type:'Strip',units_per_pack:10,mrp:12.5,requires_prescription:false} as MedicineSearchResult;
const render = (m = medicine) => renderToStaticMarkup(<BasketDrawer open={false} lines={[{medicine:m,quantity:2}]} error={null} onClose={() => {}} onQuantity={() => {}} onReview={() => {}} />);
describe('basket drawer record details', () => {
 it('renders each drawer section and primary action exactly once', () => {
  const html=render();
  for(const attribute of ['aria-label="Selected pharmacy"', 'id="basket-items"', 'aria-label="Basket subtotal"', 'aria-label="Basket fulfillment"']) expect(html.split(attribute).length - 1).toBe(1);
  expect(html.split('<footer').length - 1).toBe(1);
  expect(html.split('Review &amp; place order').length - 1).toBe(1);
 });
 it('shows real dosage, pack, unit price, line total and prescription status', () => {
  const html=render();
  for(const text of ['500 mg','Tablet','Strip','10 units per pack','INR 12.50','INR 25.00','Prescription not required','Estimated subtotal']) expect(html).toContain(text);
  expect(html).not.toContain('disabled="" aria-describedby="basket-validation"');
 });
 it('does not show free or partial totals for unknown and zero prices', () => {
  for(const mrp of [NaN,0]) {
   const html=render({...medicine,mrp});
   expect(html).toContain('Price not provided'); expect(html).not.toContain('INR 0.00'); expect(html).not.toContain('INR NaN'); expect(html).toContain('basket-validation');
  }
 });
 it('requires prescription review without inventing verified status', () => {
  const html=render({...medicine,requires_prescription:true});
  expect(html).toContain('Prescription review needed'); expect(html).toContain('basket-validation'); expect(html).not.toContain('Prescription verified');
 });
});
