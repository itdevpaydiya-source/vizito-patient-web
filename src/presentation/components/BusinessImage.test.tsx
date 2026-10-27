import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import BusinessImage from './BusinessImage';
import type { ProviderItem } from '../../services/types';
const record = { id: '1', name: 'Local business', serviceId: 'pharmacy' } as ProviderItem;
describe('business fallback images', () => {
  it('uses a type icon and real business initials for each business',()=>{
    for(const partnerType of ['pharmacy','hospital','clinic','lab','home_care','equipment','blood_bank','ambulance']){
      const html=renderToStaticMarkup(<BusinessImage p={{...record,partnerType}}/>);
      expect(html).toContain('data-media-fallback');expect(html).toContain('<svg');expect(html).toContain('<b>LB</b>');expect(html).not.toContain('<img');
    }
  });
  it('renders a generic pharmacy illustration for missing or blank logos', () => {
    for (const logo of [undefined, null, '  ']) {
      const html = renderToStaticMarkup(<BusinessImage p={{ ...record, logo }} />);
      expect(html).toContain('data-media-fallback');
      expect(html).toContain('lucide-pill');
      expect(html).toContain('<b>LB</b>'); 
      expect(html).toContain('aria-label="Local business"');
    }
  });
  it('preserves a supplied logo', () => {
    const html = renderToStaticMarkup(<BusinessImage p={{ ...record, logo: '/real-logo.png' }} />);
    expect(html).toContain('/real-logo.png'); expect(html).not.toContain('src="/images/business-fallbacks');
  });
});
