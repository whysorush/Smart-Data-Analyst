import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Supported currencies
const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'INR', 'GBP', 'JPY'] as const;
export type Currency = typeof SUPPORTED_CURRENCIES[number];

// Mock conversion rates (relative to USD)
const MOCK_RATES: Record<Currency, number> = {
  USD: 1,
  EUR: 1,
  INR: 1, // INR is always 1
  GBP: 1,
  JPY: 1,
};

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  rates: Record<Currency, number>;
  setRate: (currency: Currency, rate: number) => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrency] = useState<Currency>('INR'); // Default to INR
  const [rates, setRates] = useState<Record<Currency, number>>(MOCK_RATES);

  // Set a custom rate for a currency (except INR)
  const setRate = (curr: Currency, rate: number) => {
    if (curr === 'INR') return; // INR rate is always 1
    setRates(prev => ({ ...prev, [curr]: rate }));
  };

  // Ensure INR is always 1
  useEffect(() => {
    setRates(prev => ({ ...prev, INR: 1 }));
  }, []);

  // If a non-INR currency is selected and its rate is not set, treat as 1
  useEffect(() => {
    if (currency !== 'INR' && (!rates[currency] || rates[currency] === 1)) {
      setRates(prev => ({ ...prev, [currency]: 1 }));
    }
  }, [currency, rates]);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, rates, setRate }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within a CurrencyProvider');
  return ctx;
}

export { SUPPORTED_CURRENCIES }; 