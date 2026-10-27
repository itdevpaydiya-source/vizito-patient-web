import type { MedicineSearchResult } from '../../../services/pharmacyOrderHelper';
export type BasketLine = { medicine: MedicineSearchResult; quantity: number };
// The API has no explicit free-medicine flag; a zero MRP cannot confirm a free price.
export const hasMedicinePrice = (medicine: MedicineSearchResult) => Number.isFinite(medicine.mrp) && medicine.mrp > 0;
export const basketSubtotal = (lines: BasketLine[]): number | null => lines.some(l => !hasMedicinePrice(l.medicine)) ? null : lines.reduce((sum, l) => sum + Math.round(l.medicine.mrp * 100) * l.quantity, 0) / 100;
export function quantityProblem(medicine: MedicineSearchResult, quantity: number): string | null {
  if (!Number.isSafeInteger(quantity) || quantity < 1) return 'Choose a whole quantity of at least 1.';
  if (medicine.requires_prescription) return 'This medicine requires a prescription. Send an existing prescription for review.';
  if (!hasMedicinePrice(medicine)) return 'Price not provided. This medicine cannot be added yet.';
  if (medicine.in_stock === false) return 'This medicine is no longer available. Refresh the catalogue or choose another medicine.';
  if (medicine.available_quantity != null && Number.isSafeInteger(medicine.available_quantity) && quantity > medicine.available_quantity) return `Only ${medicine.available_quantity} units are currently listed in stock. Reduce the quantity.`;
  if (!Number.isSafeInteger(Math.round(medicine.mrp * 100) * quantity)) return 'This quantity is too large. Please reduce it.';
  return null;
}
export function addBasketMedicine(lines: BasketLine[], medicine: MedicineSearchResult, quantity: number) {
  const existing = lines.find(line => line.medicine.id === medicine.id);
  const combined = (existing?.quantity || 0) + quantity;
  const error = !Number.isSafeInteger(quantity) || quantity < 1 ? 'Choose a whole quantity of at least 1.' : quantityProblem(medicine, combined);
  if (error) return { lines, error };
  return { lines: existing ? lines.map(line => line.medicine.id === medicine.id ? { medicine, quantity: combined } : line) : [...lines, { medicine, quantity }], error: null };
}
export function changeBasketQuantity(lines: BasketLine[], id: string, quantity: number) {
  if (quantity === 0) return { lines: lines.filter(line => line.medicine.id !== id), error: null };
  const line = lines.find(line => line.medicine.id === id);
  const error = line ? quantityProblem(line.medicine, quantity) : 'Medicine not found in basket.';
  return error ? { lines, error } : { lines: lines.map(line => line.medicine.id === id ? { ...line, quantity } : line), error: null };
}
