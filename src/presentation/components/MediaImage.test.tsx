import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import MediaImage from './MediaImage';
describe('shared media illustrations',()=>{
 it('has distinct owned vector drawings for every equipment category and medicine form',()=>{
  for(const kind of ['equipment','medicine'] as const){const categories=kind==='equipment'?['OXYGEN','BED','MOBILITY','MONITOR','OTHER']:['tablet','capsule','syrup','injection','other'];const drawings=categories.map(category=>renderToStaticMarkup(<MediaImage kind={kind} category={category} name="Item"/>));expect(new Set(drawings.map(s=>s.slice(s.indexOf('<svg')))).size).toBe(5);for(const html of drawings){expect(html).toContain('data-media-fallback');expect(html).toContain('aria-label="Item"');expect(html).not.toContain('<img');}}
 });
 it('keeps an uploaded image, its accessible name and lazy loading',()=>{const html=renderToStaticMarkup(<MediaImage src="https://example.test/product.png" kind="equipment" category="BED" name="Product" className="w-20 h-20"/>);expect(html).toContain('src="https://example.test/product.png"');expect(html).toContain('alt="Product"');expect(html).toContain('loading="lazy"');expect(html).not.toContain('data-media-fallback');});
});
