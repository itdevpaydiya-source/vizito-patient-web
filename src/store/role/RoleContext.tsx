import React, { createContext, useContext, useState, type ReactNode } from 'react';
import type { UserRole,  } from '../../components/UserTypeSelection';

interface RoleContextType {
  role: UserRole | 'doctor';
  setRole: (role: UserRole | 'doctor') => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole | 'doctor'>('patient'); // Defaulting to patient for patient-specific app

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};
