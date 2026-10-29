import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import MedicineBrowser, { medicinePrice } from './MedicineBrowser';
describe('add medicines', () => {
  it('shows useful loading and empty basket content without product photos', () => {
    const html = renderToStaticMarkup(<MemoryRouter><MedicineBrowser city="Hyderabad" stocks={null} error={null} onRetry={()=>{}} estimate={null} onContinue={()=>{}} cart={[]} onAdd={() => 1} onQuantity={() => true} /></MemoryRouter>);
    for (const text of ['Loading medicines and stock', 'Your basket (0)', 'Your doctor prescription', 'Store pickup', 'Search medicines, brands or salt']) expect(html).toContain(text);
    expect(html).not.toContain('Upload prescription');expect(html).not.toContain('Family member');
  });
  it('does not turn missing prices into zero', () => {
    expect(medicinePrice(NaN)).toBe('Price not provided');
    expect(medicinePrice(0)).toBe('Price not provided');
    expect(medicinePrice(25)).toBe('INR 25.00');
  });
});
