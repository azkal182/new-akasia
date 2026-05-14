'use client';

import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';

interface DriverModeContextType {
  isDriverMode: boolean;
  isForced: boolean; // true jika role DRIVER (tidak bisa toggle off)
  setDriverMode: (value: boolean) => void;
  toggleDriverMode: () => void;
  isHydrated: boolean;
}

const DriverModeContext = createContext<DriverModeContextType | undefined>(undefined);

interface DriverModeProviderProps {
  children: ReactNode;
  /** Paksa driver mode selalu ON — digunakan untuk role DRIVER */
  forceEnabled?: boolean;
}

export function DriverModeProvider({ children, forceEnabled = false }: DriverModeProviderProps) {
  // Jika forceEnabled, mulai langsung dengan true (tidak perlu tunggu localStorage)
  const [isDriverMode, setIsDriverMode] = useState(forceEnabled);
  const [isHydrated, setIsHydrated] = useState(forceEnabled); // forced = langsung hydrated

  // Hydrate dari localStorage setelah mount (hanya jika tidak di-force)
  useEffect(() => {
    if (forceEnabled) {
      // Pastikan localStorage juga di-set agar konsisten
      localStorage.setItem('driverMode', 'true');
      setIsHydrated(true);
      return;
    }
    const saved = localStorage.getItem('driverMode');
    if (saved === 'true') {
      setIsDriverMode(true);
    }
    setIsHydrated(true);
  }, [forceEnabled]);

  const setDriverMode = useCallback((value: boolean) => {
    // Role DRIVER tidak bisa keluar dari driver mode
    if (forceEnabled && !value) return;
    setIsDriverMode(value);
    localStorage.setItem('driverMode', value.toString());
  }, [forceEnabled]);

  const toggleDriverMode = useCallback(() => {
    setDriverMode(!isDriverMode);
  }, [isDriverMode, setDriverMode]);

  return (
    <DriverModeContext.Provider value={{ isDriverMode, isForced: forceEnabled, setDriverMode, toggleDriverMode, isHydrated }}>
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
