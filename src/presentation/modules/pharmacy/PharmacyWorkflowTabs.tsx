type Workflow = 'orders' | 'requests';

// Keep the established deep links and preserve query parameters owned by other flows.
export function pharmacyTabParams(current: URLSearchParams, target: Workflow | 'active' | 'completed' | 'cancelled') {
  const next = new URLSearchParams(current);
  if (target === 'orders' || target === 'active') next.delete('tab');
  else next.set('tab', target);
  return next;
}

const workflows = ['orders', 'requests'] as const;

export default function PharmacyWorkflowTabs({selected, onSelect, requestCount, orderCount}: {
  selected: Workflow; onSelect: (value: Workflow) => void; requestCount?: number; orderCount?: number;
}) {
  return <div role="tablist" aria-label="Pharmacy workflows" className="flex w-full rounded-2xl border border-slate-200 bg-white p-1.5 sm:w-fit">
    {workflows.map((value, index) => <button
      key={value} type="button" role="tab" id={`pharmacy-tab-${value}`}
      aria-selected={selected === value} aria-controls={`pharmacy-panel-${value}`}
      tabIndex={selected === value ? 0 : -1}
      onClick={() => { if (selected !== value) onSelect(value); }}
      onKeyDown={event => {
        let next: number;
        if (event.key === 'ArrowRight') next = (index + 1) % workflows.length;
        else if (event.key === 'ArrowLeft') next = (index + workflows.length - 1) % workflows.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = workflows.length - 1;
        else return;
        event.preventDefault();
        (event.currentTarget.parentElement?.children[next] as HTMLButtonElement)?.focus();
        if (workflows[next] !== selected) onSelect(workflows[next]);
      }}
      className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-3 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2 sm:flex-none sm:px-6 sm:text-sm ${selected === value ? 'bg-orange-50 text-orange-900 ring-1 ring-inset ring-orange-200' : 'text-slate-600 hover:bg-slate-50'}`}
    >{value === 'orders' ? 'Orders' : 'Prescription requests'}{(value === 'orders' ? orderCount : requestCount) !== undefined && <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px]">{value === 'orders' ? orderCount : requestCount}</span>}</button>)}
  </div>;
}
