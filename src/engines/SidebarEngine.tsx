import React from 'react';
import { NavLink } from 'react-router-dom';
import * as Icons from 'lucide-react';
import type { DynamicMenu } from '../mocks/dynamicPayload';

interface SidebarEngineProps {
  menus: DynamicMenu[];
  onMenuClick?: () => void;
}

export const SidebarEngine: React.FC<SidebarEngineProps> = ({ menus, onMenuClick }) => {
  // Sort menus by sort_order just to be safe
  const sortedMenus = [...menus].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="flex flex-col gap-2 py-4">
      {sortedMenus.map((menu) => {
        // Dynamically get the Icon component from lucide-react based on the icon string from DB
        const IconComponent = (Icons as any)[menu.icon] || Icons.HelpCircle;

        return (
          <NavLink
            key={menu.id}
            to={menu.path}
            end={menu.path === '/dashboard'}
            onClick={onMenuClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-teal-50 text-teal-700 font-semibold shadow-sm border border-teal-100/50'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium border border-transparent'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <IconComponent
                  className={`w-5 h-5 transition-colors ${
                    isActive ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span>{menu.name}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </div>
  );
};
