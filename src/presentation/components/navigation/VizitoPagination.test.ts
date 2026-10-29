import { describe, expect, it } from 'vitest';
import { pageWindow } from './VizitoPagination';

describe('VizitoPagination page window', () => {
  it('shows every page for short result sets', () => {
    expect(pageWindow(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('keeps the first, last, current and adjacent pages for long result sets', () => {
    expect(pageWindow(6, 12)).toEqual([1, 5, 6, 7, 12]);
  });

  it('does not emit pages outside the available range', () => {
    expect(pageWindow(1, 10)).toEqual([1, 2, 10]);
    expect(pageWindow(10, 10)).toEqual([1, 9, 10]);
  });
});
