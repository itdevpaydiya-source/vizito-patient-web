import {describe, it, expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import PharmacyWorkflowTabs, {pharmacyTabParams} from './PharmacyWorkflowTabs';

describe('pharmacy workflow navigation', () => {
  it('preserves unrelated query parameters and established category links', () => {
    const source = new URLSearchParams('tab=requests&prescription=rx-1&source=records');
    expect(pharmacyTabParams(source, 'completed').toString()).toBe('tab=completed&prescription=rx-1&source=records');
    expect(pharmacyTabParams(source, 'orders').toString()).toBe('prescription=rx-1&source=records');
    expect(pharmacyTabParams(source, 'requests').get('tab')).toBe('requests');
    expect(source.get('tab')).toBe('requests');
  });
  it('exposes two distinct accessible workflows with one keyboard entry point', () => {
    const html = renderToStaticMarkup(<PharmacyWorkflowTabs selected="requests" onSelect={() => {}} requestCount={6} orderCount={13} />);
    expect(html.match(/role="tab"/g)).toHaveLength(2);
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    expect(html).toContain('id="pharmacy-tab-requests" aria-selected="true"');
    expect(html).not.toContain('Completed');expect(html).toContain('>13</span>');expect(html).toContain('>6</span>');
  });
});
