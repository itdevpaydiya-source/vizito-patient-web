import {describe, it, expect, vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import LabBookingsEmpty from './LabBookingsEmpty';

describe('lab bookings empty state', () => {
  it('offers test discovery without unsupported verification or availability promises', () => {
    const html = renderToStaticMarkup(<LabBookingsEmpty onFindTests={() => {}} />);
    expect(html).toContain('No lab bookings yet');
    expect(html.match(/<button /g)).toHaveLength(1);
    expect(html.match(/<li /g)).toHaveLength(4);
    expect(html).toContain('once released');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('verified');
  });
  it('uses the existing discovery callback', () => {
    const onFindTests = vi.fn();
    const tree = LabBookingsEmpty({onFindTests});
    const main = tree.props.children.find((child: any) => child?.props?.className === 'lab-empty-main');
    const button = main.props.children.find((child: any) => child?.type === 'button');
    button.props.onClick();
    expect(onFindTests).toHaveBeenCalledOnce();
  });
});
