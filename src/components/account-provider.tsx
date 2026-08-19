'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  zone: string | null;
}

interface AccountContextValue {
  customer: CustomerProfile | null;
  /** False until the first /me check resolves — avoids flashing "Sign in". */
  ready: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  setCustomer: (customer: CustomerProfile | null) => void;
}

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/account/me');
      const data = await res.json();
      setCustomer(data.customer ?? null);
    } catch {
      // Offline or the accounts table is not migrated yet — treat as signed out
      // rather than breaking the page.
      setCustomer(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    await fetch('/api/account/logout', { method: 'POST' }).catch(() => {});
    setCustomer(null);
  }, []);

  const value = useMemo<AccountContextValue>(
    () => ({ customer, ready, refresh, signOut, setCustomer }),
    [customer, ready, refresh, signOut],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount must be used inside <AccountProvider>');
  return ctx;
}
