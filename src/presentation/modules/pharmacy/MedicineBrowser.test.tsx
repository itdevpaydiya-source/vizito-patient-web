import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import MedicineBrowser, { medicinePrice } from './MedicineBrowser';
describe('add medicines', () => {
  it('shows useful loading and empty basket content without product photos', () => {
    const html = renderToStaticMarkup(<MemoryRouter><MedicineBrowser pharmacyId="1" pharmacy={null} cart={[]} onAdd={() => 1} onQuantity={() => true} onChange={() => {}} /></MemoryRouter>);
    for (const text of ['Loading this pharmacy', 'No medicines added yet', 'Prescription', 'Fulfillment options', 'Search medicine name']) expect(html).toContain(text);
    expect(html).not.toContain('<img');
  });
  it('does not turn missing prices into zero', () => {
    expect(medicinePrice(NaN)).toBe('Price not provided');
    expect(medicinePrice(0)).toBe('Price not provided');
    expect(medicinePrice(25)).toBe('INR 25.00');
  });
});
