import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { isValidElement, type ReactNode } from 'react';
import ReviewOrder, { ReviewSteps } from './ReviewOrder';
import type { ProviderItem } from '../../../services/types';
import type { BasketLine } from './medicineBasket';
const line = { medicine: { id: 'm1', medicine_name: 'Test medicine', mrp: 12.5, requires_prescription: false, available_quantity: 3 }, quantity: 2 } as BasketLine;
const pharmacy = { id: 'p1', name: 'API pharmacy', address: 'API address', licenseStatus: 'Verified' } as ProviderItem;
const props = (lines = [line]) => ({ pharmacy, lines, busy: false, onEdit: vi.fn(), onChange: vi.fn(), onContinue: vi.fn(), onQuantity: vi.fn(() => true), onPrescription: vi.fn() });
const render = (lines = [line]) => renderToStaticMarkup(<ReviewOrder {...props(lines)} />);
function elements(node: ReactNode): any[] {
 if (Array.isArray(node)) return node.flatMap(elements);
 if (!isValidElement(node)) return [];
 return [node, ...elements((node.props as any).children)];
}
describe('review order', () => {
 it('renders real totals, unit price and no unrelated navigation or distance', () => {
  const html = render();
  for (const value of ['INR 25.00', 'INR 12.50', 'per unit', 'API pharmacy', 'Licensed pharmacy', 'Continue to fulfillment', 'Edit basket']) expect(html).toContain(value);
  for (const value of ['Back to medicines', 'away', 'Not available', 'Address not provided', 'Upload']) expect(html).not.toContain(value);
 });
 it('does not substitute missing or zero prices or details', () => {
  for (const mrp of [NaN, 0]) {
   const html = render([{ ...line, medicine: { ...line.medicine, mrp } }]);
   expect(html).not.toContain('INR');expect(html).toContain('Estimated subtotal');expect(html).toContain('Subtotal confirmed by pharmacy');expect(html).toContain('disabled');
  }
 });
 it('shows just one Rx validation message and existing prescription action', () => {
  const html = render([{ ...line, medicine: { ...line.medicine, requires_prescription: true } }]);
  expect(html.match(/This medicine requires a prescription/g)).toHaveLength(1);
  expect(html).toContain('>Rx</span>');expect(html).toContain('Send prescription instead');expect(html).not.toContain('Upload');
 });
 it('wires quantity, removal, edit, pharmacy and prescription actions to supplied handlers', () => {
  const p = props();const buttons = elements(ReviewOrder(p)).filter(e => e.type === 'button');
  buttons.find(e => e.props['aria-label'] === 'Increase quantity of Test medicine').props.onClick();
  buttons.find(e => e.props['aria-label'] === 'Decrease quantity of Test medicine').props.onClick();
  buttons.find(e => e.props['aria-label'] === 'Remove Test medicine').props.onClick();
  expect(p.onQuantity.mock.calls).toEqual([['m1', 3], ['m1', 1], ['m1', 0]]);
  buttons.find(e => e.props['aria-label'] === 'Edit choose a pharmacy').props.onClick();expect(p.onChange).toHaveBeenCalledOnce();
  buttons.find(e => e.props['aria-label'] === 'Edit add medicines').props.onClick();expect(p.onEdit).toHaveBeenCalledOnce();
  const rx = { ...p, lines: [{ ...line, medicine: { ...line.medicine, requires_prescription: true } }] };
  elements(ReviewOrder(rx)).find(e => e.type === 'button' && e.props.children === 'Send prescription instead').props.onClick();expect(p.onPrescription).toHaveBeenCalledOnce();
 });
 it('respects quantity bounds and saving state', () => {
  for (const p of [{ ...props(), lines: [{ ...line, quantity: 3 }] }, { ...props(), busy: true }]) {
   expect(elements(ReviewOrder(p)).find(e => e.props['aria-label'] === 'Increase quantity of Test medicine').props.disabled).toBe(true);
  }
  expect(elements(ReviewOrder({ ...props(), lines: [{ ...line, quantity: 1 }] })).find(e => e.props['aria-label'] === 'Decrease quantity of Test medicine').props.disabled).toBe(true);
 });
 it('renders only supplied verification and today schedule without claiming open now', () => {
  const day = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
  const html = renderToStaticMarkup(<ReviewOrder {...props()} pharmacy={{ ...pharmacy, licenseStatus: 'Pending', registrationVerified: true, businessHours: [{ day, open_time: '09:00', close_time: '21:00', is_closed: false }, { day: 'Other day', open_time: '08:00', close_time: '22:00', is_closed: false }] }} />);
  expect(html).toContain('Registration verified');expect(html).toContain('License: Pending');expect(html).toContain('Open today 9:00 AM \u2013 9:00 PM');expect(html).not.toContain('Other day');expect(html).not.toContain('Open now');expect(html).not.toContain('Licensed pharmacy');
 });
 it('has the three-step header and five-step next list', () => {
  const header = renderToStaticMarkup(<ReviewSteps />);expect(header).toContain('Review');expect(header.match(/aria-label="Complete"/g)).toHaveLength(2);
  const html = render();for (const label of ['Choose a pharmacy', 'Add medicines', 'Review order', 'Fulfillment', 'Payment']) expect(html).toContain(label);
 });
 it('handles an empty basket without a fabricated zero total', () => { expect(render([])).toContain('Your basket is empty');expect(render([])).not.toContain('INR'); });
});
