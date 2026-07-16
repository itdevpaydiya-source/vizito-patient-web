import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { ActionType } from '../mocks/dynamicPayload';

// Defines the shape of our context
interface PermissionContextType {
  permissions: Record<string, ActionType[]>;
  can: (module: string, action: ActionType) => boolean;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export const PermissionProvider = ({
  permissions,
  children,
}: {
  permissions: Record<string, ActionType[]>;
  children: ReactNode;
}) => {
  // Check if a user can perform an action on a module
  const can = (module: string, action: ActionType): boolean => {
    return permissions[module]?.includes(action) ?? false;
  };

  return (
    <PermissionContext.Provider value={{ permissions, can }}>
      {children}
    </PermissionContext.Provider>
  );
};

// Hook for consuming permissions
export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};

// Component Wrapper to conditionally render elements based on permissions
export const RequirePermission = ({
  module,
  action,
  children,
  fallback = null,
}: {
  module: string;
  action: ActionType;
  children: ReactNode;
  fallback?: ReactNode;
}) => {
  const { can } = usePermissions();
  if (can(module, action)) {
    return <>{children}</>;
  }
  return <>{fallback}</>;
};
