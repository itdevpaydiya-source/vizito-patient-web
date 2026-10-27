import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import BasketToast from './BasketToast';
describe('basket toast',()=>{
 it('does not render a box or actions without a successful addition',()=>{
  const html=renderToStaticMarkup(<BasketToast addition={null} onDismiss={()=>{}} onViewBasket={()=>{}}/>);
  expect(html).not.toContain('<aside'); expect(html).not.toContain('<button');expect(html).toContain('aria-live="polite"');
 });
 it('renders one compact notification with actual added quantity and keyboard actions',()=>{
  const html=renderToStaticMarkup(<BasketToast addition={{id:1,name:'Catalogue test medicine',quantity:2}} onDismiss={()=>{}} onViewBasket={()=>{}}/>);
  expect(html.split('<aside').length-1).toBe(1);expect(html).toContain('Catalogue test medicine: 2 units added to basket.');expect(html).toContain('View basket');expect(html).toContain('Continue shopping');expect(html).toContain('Dismiss added confirmation');
 });
});
