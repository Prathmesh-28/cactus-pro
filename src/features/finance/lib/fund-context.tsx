import { createContext, useContext, useEffect, useState, type ReactNode } from "react";


export type FundKey = "fund_1" | "fund_2";

const STORAGE_KEY = "cactus.activeFund";

type Ctx = {
  fund: FundKey;
  setFund: (f: FundKey) => void;
};

const FundContext = createContext<Ctx | null>(null);

// Module-level mirror so non-hook code (data-hooks, snapshots) can read the
// active fund without subscribing to React state.
let _activeFund: FundKey = "fund_1";
export function getActiveFund(): FundKey {
  return _activeFund;
}

export function FundProvider({ children }: { children: ReactNode }) {
  const [fund, setFundState] = useState<FundKey>(() => {
    if (typeof window === "undefined") return "fund_1";
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "fund_2" ? "fund_2" : "fund_1";
  });

  useEffect(() => {
    _activeFund = fund;
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, fund);
  }, [fund]);

  function setFund(next: FundKey) {
    setFundState(next);
    _activeFund = next;
    // Dispatch custom event so all finance hooks re-read localStorage.
    window.dispatchEvent(new CustomEvent('fin-store-changed', { detail: { key: '' } }));
  }

  return <FundContext.Provider value={{ fund, setFund }}>{children}</FundContext.Provider>;
}

export function useFund(): Ctx {
  const ctx = useContext(FundContext);
  if (!ctx) throw new Error("useFund must be used inside <FundProvider>");
  return ctx;
}
