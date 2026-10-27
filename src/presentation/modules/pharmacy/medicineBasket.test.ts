import { describe, expect, it } from 'vitest';
import { addBasketMedicine, basketSubtotal, changeBasketQuantity } from './medicineBasket';
import type { MedicineSearchResult } from '../../../services/pharmacyOrderHelper';
const medicine = { id: 'm1', medicine_name: 'Test medicine', mrp: 12.35, requires_prescription: false, in_stock: true, available_quantity: 4 } as MedicineSearchResult;
describe('medicine basket rules', () => {
  it('merges duplicate medicines and calculates rounded catalogue totals', () => {
    const first = addBasketMedicine([], medicine, 1);
    const second = addBasketMedicine(first.lines, medicine, 2);
    expect(second.error).toBeNull(); expect(second.lines).toHaveLength(1);
    expect(second.lines[0].quantity).toBe(3); expect(basketSubtotal(second.lines)).toBe(37.05);
  });
  it('enforces stock across duplicate additions without changing the existing basket', () => {
    const first = addBasketMedicine([], medicine, 3);
    const rejected = addBasketMedicine(first.lines, medicine, 2);
    expect(rejected.lines).toBe(first.lines); expect(rejected.error).toContain('Only 4 units');
  });
  it('rejects Rx medicines, unavailable stock, missing prices and invalid quantities', () => {
    for (const item of [{ ...medicine, requires_prescription: true }, { ...medicine, in_stock: false }, { ...medicine, mrp: NaN }, { ...medicine, mrp: 0 }]) expect(addBasketMedicine([], item, 1).error).toBeTruthy();
    for (const quantity of [0, -1, 1.5, NaN, Infinity]) expect(addBasketMedicine([], medicine, quantity).error).toBeTruthy();
  });
  it('updates and removes quantities, including removing the final line', () => {
    const first = addBasketMedicine([], medicine, 2).lines;
    expect(changeBasketQuantity(first, 'm1', 4).lines[0].quantity).toBe(4);
    expect(changeBasketQuantity(first, 'm1', 5).error).toBeTruthy();
    expect(changeBasketQuantity(first, 'm1', 0).lines).toEqual([]);
  });
  it('increments by exactly one for consecutive one-unit additions', () => {
    let lines = addBasketMedicine([], medicine, 1).lines;
    lines = addBasketMedicine(lines, medicine, 1).lines;
    lines = addBasketMedicine(lines, medicine, 1).lines;
    expect(lines).toHaveLength(1); expect(lines[0].quantity).toBe(3);
  });
  it('does not show a partial subtotal for missing or zero pricing', () => {
    for (const mrp of [NaN, 0]) expect(basketSubtotal([{medicine, quantity: 1}, {medicine: {...medicine, id: 'm2', mrp}, quantity: 1}])).toBeNull();
  });
  it('uses the latest real catalogue price on a repeated addition', () => {
    const first = addBasketMedicine([], medicine, 1).lines;
    const updated = addBasketMedicine(first, { ...medicine, mrp: 13 }, 1);
    expect(basketSubtotal(updated.lines)).toBe(26);
  });
});
