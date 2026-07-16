import React from 'react';
import type { DynamicWidget } from '../mocks/dynamicPayload';
import { getWidgetComponent } from './WidgetRegistry';

interface DashboardEngineProps {
  widgets: DynamicWidget[];
}

export const DashboardEngine: React.FC<DashboardEngineProps> = ({ widgets }) => {
  return (
    <div className="grid grid-cols-12 gap-6 w-full">
      {widgets.map((widget) => {
        const WidgetComponent = getWidgetComponent(widget.component_key);
        // We use the gridArea config to determine how wide the widget should be
        const gridClass = widget.config?.gridArea || 'col-span-12 lg:col-span-6';

        return (
          <div key={widget.id} className={gridClass}>
            <WidgetComponent 
              title={widget.title} 
              componentKey={widget.component_key} 
              config={widget.config}
            />
          </div>
        );
      })}
    </div>
  );
};
