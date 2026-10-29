import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

const positive = (value: string | null, fallback: number) => { const parsed = Number(value); return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback; };

export function useVizitoPagination<T>(items: T[], key = '') {
  const [params, setParams] = useSearchParams();
  const pageKey = key ? `${key}Page` : 'page';
  const sizeKey = key ? `${key}PageSize` : 'pageSize';
  const pageSize = positive(params.get(sizeKey), 10) === 20 ? 20 as const : 10 as const;
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const requestedPage = positive(params.get(pageKey), 1);
  const page = Math.min(requestedPage, pageCount);
  const update = (next: Record<string, number>) => setParams(current => {
    const copy = new URLSearchParams(current);
    Object.entries(next).forEach(([name, value]) => value === 1 && name === pageKey ? copy.delete(name) : copy.set(name, String(value)));
    return copy;
  }, { replace: false });
  const setPage = (value: number) => update({ [pageKey]: Math.min(Math.max(1, value), pageCount) });
  const setPageSize = (value: 10 | 20) => update({ [sizeKey]: value, [pageKey]: 1 });
  useEffect(() => { if (requestedPage > pageCount) update({ [pageKey]: pageCount }); }, [requestedPage, pageCount]); // eslint-disable-line react-hooks/exhaustive-deps
  const visibleItems = useMemo(() => items.slice((page - 1) * pageSize, page * pageSize), [items, page, pageSize]);
  return { page, pageSize, pageCount, visibleItems, setPage, setPageSize, resetPage: () => update({ [pageKey]: 1 }) };
}
