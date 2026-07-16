import React, { useState } from 'react';
import { MOCK_REVENUE_BY_CLINIC } from '../mocks/doctorFlowMocks';
import { TrendingUp, Users, ChevronDown, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RevenueOverviewWidgetProps {
  selectedClinic: string | null;
}

const RevenueOverviewWidget: React.FC<RevenueOverviewWidgetProps> = ({ selectedClinic }) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('Current Month');
  const [isOpen, setIsOpen] = useState(false);

  // Get base clinic data
  const clinicKey = selectedClinic || 'all';
  const baseRevenue = MOCK_REVENUE_BY_CLINIC[clinicKey] || MOCK_REVENUE_BY_CLINIC.all;

  // Dynamically compute values based on the selected period
  let factor = 1.0;
  let trendStr = baseRevenue.trend;
  let labelSuffix = 'vs last month';

  if (filter === 'Last Month') {
    factor = 0.85;
    trendStr = '+14.2%';
    labelSuffix = 'vs previous period';
  } else if (filter === 'Current Year') {
    factor = 8.5;
    trendStr = '+28.4%';
    labelSuffix = 'vs last year';
  } else if (filter === 'Custom Date') {
    factor = 0.45;
    trendStr = '+6.1%';
    labelSuffix = 'for selected range';
  }

  const totalRevenue = Math.round(baseRevenue.totalRevenue * factor);
  const netEarnings = Math.round(baseRevenue.netEarnings * factor);
  const consultations = Math.round(baseRevenue.consultations * factor);

  // Filter dynamic chart points
  const baseChartData = baseRevenue.chartData;
  const displayChartData = baseChartData.map((d: any) => ({
    label: d.label,
    value: Math.round(d.value * factor)
  }));

  const maxVal = Math.max(...displayChartData.map((d: any) => d.value), 1);
  const minVal = 0;
  const W = 240;
  const H = 80;
  const pad = { top: 8, bottom: 8, left: 0, right: 0 };

  const points = displayChartData.map((d: any, i: number) => {
    const x = pad.left + (i / (displayChartData.length - 1)) * (W - pad.left - pad.right);
    const y = pad.top + (1 - (d.value - minVal) / (maxVal - minVal)) * (H - pad.top - pad.bottom);
    return { x, y, ...d };
  });

  const pathD = points.map((p: any, i: number) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${H} L ${points[0].x} ${H} Z`;

  const handleWidgetClick = () => {
    const periodParam = filter.toLowerCase().replace(' ', '_');
    navigate(`/revenue?period=${periodParam}`);
  };

  // Check if revenue data is empty
  const isEmpty = totalRevenue === 0;

  return (
    <div className="glass-panel overflow-hidden flex flex-col h-full hover-grow card-glow-primary">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
        <h3 
          onClick={handleWidgetClick}
          className="text-base font-bold text-[#2B2B2B] cursor-pointer hover:text-[#5C2494] transition-colors"
        >
          Revenue Overview
        </h3>
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-100 transition-colors"
          >
            {filter}
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
          {isOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-slate-200 shadow-lg rounded-xl py-1 z-40">
                {['Current Month', 'Last Month', 'Current Year', 'Custom Date'].map(f => (
                  <button
                    key={f}
                    onClick={() => { setFilter(f); setIsOpen(false); }}
                    className="w-full text-left px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-teal-50 hover:text-teal-700"
                  >
                    {f}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div 
        onClick={handleWidgetClick}
        className="px-5 pt-4 flex-1 flex flex-col justify-between cursor-pointer group"
      >
        {isEmpty ? (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
              <DollarSign className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No revenue available.</p>
          </div>
        ) : (
          /* Revenue Info & Visual Chart */
          <>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Revenue</p>
              <div className="flex items-end gap-2 mt-1.5">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                  ₹{totalRevenue.toLocaleString('en-IN')}
                </h2>
                <div className="flex items-center gap-1 mb-1 text-[#54BC88] text-[11px] font-bold">
                  <TrendingUp className="w-3 h-3" />
                  <span>{trendStr} {labelSuffix}</span>
                </div>
              </div>
            </div>

            {/* SVG Line Chart */}
            <div className="flex-1 flex flex-col justify-center my-4">
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 80 }} preserveAspectRatio="none">
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5C2494" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#5C2494" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={areaD} fill="url(#revenueGradient)" />
                <path d={pathD} fill="none" stroke="#5C2494" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3.5" fill="#5C2494" />
              </svg>

              {/* X-axis labels */}
              <div className="flex justify-between mt-1">
                {displayChartData.map((d: any) => (
                  <span key={d.label} className="text-[9px] text-slate-400 font-medium">{d.label}</span>
                ))}
              </div>
            </div>

            {/* Bottom Stats */}
            <div className="flex items-center gap-3 pb-4">
              <div className="flex items-center gap-2 bg-gradient-to-br from-[#FAF5FF] to-white rounded-xl px-3 py-2 flex-1 border border-[#5C2494]/10 hover:border-[#5C2494]/25 transition-all">
                <div className="w-6 h-6 bg-[#E9D5FF]/40 rounded-lg flex items-center justify-center shrink-0">
                  <TrendingUp className="w-3.5 h-3.5 text-[#5C2494]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-0.5">Net Earnings</p>
                  <p className="text-xs font-black text-slate-800 truncate">₹{netEarnings.toLocaleString('en-IN')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-gradient-to-br from-[#FEF3C7] to-white rounded-xl px-3 py-2 flex-1 border border-[#7C3AED]/10 hover:border-[#7C3AED]/25 transition-all">
                <div className="w-6 h-6 bg-[#D97706]/30 rounded-lg flex items-center justify-center shrink-0">
                  <Users className="w-3.5 h-3.5 text-[#7C3AED]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-0.5">Consultations</p>
                  <p className="text-xs font-black text-slate-800 truncate">{consultations}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer Button */}
      <button
        onClick={handleWidgetClick}
        className="w-full border-t border-slate-100 py-3.5 text-xs font-black uppercase tracking-wider text-[#5C2494] hover:bg-[#FAF5FF]/40 transition-colors"
      >
        View Revenue Details
      </button>
    </div>
  );
};

export default RevenueOverviewWidget;
