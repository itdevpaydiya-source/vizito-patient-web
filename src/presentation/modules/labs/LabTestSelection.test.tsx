import {it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import LabTestSelection,{LabBookingProgress} from './LabTestSelection';
import type {LabTestDef} from '../../../services/labHelper';

it('renders catalogue fields and selection without inventing general test prices',()=>{
 const tests=[{code:'T1',name:'API test',department:'API department',about:'API description'}] as LabTestDef[];
 const html=renderToStaticMarkup(<LabTestSelection tests={tests} chosen={['T1']} onToggle={()=>{}} onClear={()=>{}} onContinue={()=>{}} query="" onQuery={()=>{}}/>);
 for(const value of ['API test','API department','API description','Selected tests (1)','No lab offers this selection together'])expect(html).toContain(value);
 expect(html).toContain('aria-label="Test category"');expect(html).toContain('aria-label="Selected tests"');expect(html).not.toContain('Selected tests actions');expect(html).not.toContain('INR');expect(html).not.toContain('accredited');
});
it('shows five progress steps and a single current step',()=>{
 const html=renderToStaticMarkup(<LabBookingProgress step={2}/>);
 expect(html.match(/<li[ >]/g)).toHaveLength(5);expect(html.match(/aria-current="step"/g)).toHaveLength(1);
});
