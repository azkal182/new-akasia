'use client';

import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';

interface DriverModeContextType {
  isDriverMode: boolean;
  setDriverMode: (value: boolean) => void;
  toggleDriverMode: () => void;
  isHydrated: boolean;
}

const DriverModeContext = createContext<DriverModeContextType | undefined>(undefined);

export function DriverModeProvider({ children }: { children: ReactNode }) {
  // Start with false to match server render, then hydrate from localStorage
  const [isDriverMode, setIsDriverMode] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage after mount (client-only)
  useEffect(() => {
    const saved = localStorage.getItem('driverMode');
    if (saved === 'true') {
      setIsDriverMode(true);
    }
    setIsHydrated(true);
  }, []);

  const setDriverMode = useCallback((value: boolean) => {
    setIsDriverMode(value);
    localStorage.setItem('driverMode', value.toString());
  }, []);

  const toggleDriverMode = useCallback(() => {
    setDriverMode(!isDriverMode);
  }, [isDriverMode, setDriverMode]);

  return (
    <DriverModeContext.Provider value={{ isDriverMode, setDriverMode, toggleDriverMode, isHydrated }}>
      {children}
    </DriverModeContext.Provider>
  );
}

export function useDriverMode() {
  const context = useContext(DriverModeContext);
  if (!context) {
    throw new Error('useDriverMode must be used within a DriverModeProvider');
  }
  return context;
}
