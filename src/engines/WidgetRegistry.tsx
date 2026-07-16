import React from 'react';
import { TodaysAppointments } from '../widgets/TodaysAppointments';
import { RevenueSummary } from '../widgets/RevenueSummary';
import { BedOccupancy } from '../widgets/BedOccupancy';
import { LayoutDashboard } from 'lucide-react';

// Fallback widget if the registry doesn't have the component mapped
const PlaceholderWidget = ({ title, componentKey, config }: { title: string, componentKey: string, config?: any }) => (
  <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-6 flex flex-col items-center justify-center text-center h-full min-h-[150px]">
    <LayoutDashboard className="w-8 h-8 text-slate-400 mb-3" />
    <h3 className="font-bold text-slate-700 text-sm">{title}</h3>
    <p className="text-xs text-slate-400 mt-1">Component: {componentKey}</p>
    <p className="text-[10px] text-[#D97706] mt-2 font-medium">Pending Implementation</p>
  </div>
);

// The Registry maps string keys (from DB) to React Components
export const WidgetRegistry: Record<string, React.FC<any>> = {
  TodaysAppointments,
  RevenueSummary,
  BedOccupancy,
  // As you build more widgets, import and add them here:
  // UpcomingAppointments,
  // BedOccupancy,
  // InventoryStatus,
};

// Helper to get a widget safely
export const getWidgetComponent = (componentKey: string): React.FC<any> => {
  return WidgetRegistry[componentKey] || PlaceholderWidget;
};
