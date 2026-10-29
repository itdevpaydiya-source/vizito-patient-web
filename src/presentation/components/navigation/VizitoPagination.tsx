import { ChevronLeft, ChevronRight } from 'lucide-react';
import ThemedSelect from '../forms/ThemedSelect';
import './VizitoPagination.css';

export interface VizitoPaginationProps {
  page: number;
  pageSize: 10 | 20;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: 10 | 20) => void;
  label?: string;
}

export const pageWindow = (page: number, pages: number) => {
  if (pages <= 7) return Array.from({ length: pages }, (_, index) => index + 1);
  const values = new Set([1, pages, page - 1, page, page + 1].filter(value => value >= 1 && value <= pages));
  return Array.from(values).sort((a, b) => a - b);
};

export default function VizitoPagination({ page, pageSize, total, onPageChange, onPageSizeChange, label = 'results' }: VizitoPaginationProps) {
  if (total <= 0) return null;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pages);
  const start = (current - 1) * pageSize + 1;
  const end = Math.min(current * pageSize, total);
  const numbers = pageWindow(current, pages);
  return <nav className="vizito-pagination" aria-label={`${label} pagination`}>
    <p aria-live="polite">Showing {start.toLocaleString('en-IN')}–{end.toLocaleString('en-IN')} of {total.toLocaleString('en-IN')}</p>
    <div className="vizito-pagination__controls">
      <button type="button" disabled={current === 1} onClick={() => onPageChange(current - 1)} aria-label={`Previous ${label} page`}><ChevronLeft aria-hidden="true"/> <span>Previous</span></button>
      <div className="vizito-pagination__numbers">
        {numbers.map((value, index) => <span key={value} className="vizito-pagination__number-wrap">
          {index > 0 && value - numbers[index - 1] > 1 && <i aria-hidden="true">…</i>}
          <button type="button" aria-current={value === current ? 'page' : undefined} aria-label={`${label} page ${value}`} onClick={() => onPageChange(value)}>{value}</button>
        </span>)}
      </div>
      <button type="button" disabled={current === pages} onClick={() => onPageChange(current + 1)} aria-label={`Next ${label} page`}><span>Next</span> <ChevronRight aria-hidden="true"/></button>
    </div>
    <label>Rows per page <ThemedSelect aria-label={`Rows per ${label} page`} variant="menu" value={String(pageSize)} onChange={event => onPageSizeChange(Number(event.target.value) as 10 | 20)}><option value="10">10</option><option value="20">20</option></ThemedSelect></label>
  </nav>;
}
