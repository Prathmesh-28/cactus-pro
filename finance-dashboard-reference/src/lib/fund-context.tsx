import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

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
  const qc = useQueryClient();
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
    // Invalidate every data-hook query so all pages refetch for the new fund.
    qc.invalidateQueries();
  }

  return <FundContext.Provider value={{ fund, setFund }}>{children}</FundContext.Provider>;
}

export function useFund(): Ctx {
  const ctx = useContext(FundContext);
  if (!ctx) throw new Error("useFund must be used inside <FundProvider>");
  return ctx;
}
