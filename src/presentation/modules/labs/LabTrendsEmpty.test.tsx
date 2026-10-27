import {it, expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import LabTrendsEmpty from './LabTrendsEmpty';

it('explains released results with four guidance tiles and no fabricated readings',()=>{
  const html=renderToStaticMarkup(<LabTrendsEmpty/>);
  expect(html).toContain('Your health trends will appear here');
  expect(html).toContain('Once a lab releases your reports');
  expect(html.match(/<li /g)).toHaveLength(4);
  expect(html).not.toContain('<button');
  expect(html).not.toContain('<img');
});
