import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ProviderImage,{initialsOf} from './ProviderImage';
describe('provider image fallback',()=>{it('ignores punctuation and digits, retaining Unicode letters',()=>{expect(initialsOf('Injection / IV at home')).toBe('II');expect(initialsOf('/ + 123')).toBe('');expect(initialsOf('Dr. Élodie / Noël')).toBe('ÉN');});it('uses an icon rather than service initials',()=>{const markup=renderToStaticMarkup(createElement(ProviderImage,{type:'homecare',service:true,name:'Injection / IV at home'}));expect(markup).toContain('aria-label="Injection / IV at home"');expect(markup).toContain('<svg');expect(markup).not.toContain('<b>');});});
