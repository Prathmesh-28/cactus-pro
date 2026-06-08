/**
 * Cap table dilution modelling — pure functions, fully unit-tested.
 *
 * Models a priced equity round with an optional pre-money option-pool top-up
 * (the classic "option pool shuffle", where the new pool is carved out of the
 * pre-money valuation and therefore dilutes existing holders, not the new
 * investors). All maths is share-count based so it is exact and scale-invariant.
 */

export interface Holder {
  /** Display name, e.g. "Founders", "Cactus Partners", "ESOP Pool". */
  name: string;
  /** Fully-diluted shares held before the round. */
  shares: number;
}

export interface RoundInputs {
  /** Pre-money valuation in any consistent currency unit (₹Cr is fine). */
  preMoney: number;
  /** New capital raised in the round (same unit as preMoney). */
  newMoney: number;
  /**
   * Target size of the NEWLY created option pool as a fraction of the
   * post-round fully-diluted cap (e.g. 0.10 for 10%). The new pool is added
   * pre-money. Omit or 0 for no top-up.
   */
  optionPoolTargetPct?: number;
  /** Label for the incoming investor line. Defaults to "New Investors". */
  investorName?: string;
}

export interface CapRow {
  name: string;
  shares: number;
  /** Ownership as a fraction (0..1). */
  pct: number;
}

export interface RoundResult {
  /** Post-money valuation (preMoney + newMoney). */
  postMoney: number;
  /** Price per share for the round. */
  pricePerShare: number;
  /** Shares issued to the new investors. */
  investorShares: number;
  /** Newly created option-pool shares (0 if no top-up requested). */
  newPoolShares: number;
  /** Total fully-diluted shares after the round. */
  postShares: number;
  /** Pre-round cap table (with computed pct). */
  before: CapRow[];
  /** Post-round cap table, including new investor + new pool lines. */
  after: CapRow[];
  /** Dilution suffered by each pre-existing holder, in percentage points (>=0). */
  dilution: { name: string; pointsLost: number }[];
}

/** Sum of shares across holders. */
export function totalShares(holders: Holder[]): number {
  return holders.reduce((s, h) => s + (h.shares > 0 ? h.shares : 0), 0);
}

/** Attach ownership fractions to a holder list. */
export function withPct(holders: Holder[]): CapRow[] {
  const total = totalShares(holders);
  return holders.map((h) => ({
    name: h.name,
    shares: h.shares,
    pct: total > 0 ? h.shares / total : 0,
  }));
}

/**
 * Derive a synthetic share count from ownership percentages when only %s are
 * known (the app's CapTableEntry stores holdingPct but often blank shares).
 * Uses a 10,000,000-share base; dilution maths is %-invariant so the base is
 * arbitrary.
 */
export function holdersFromPct(
  entries: { name: string; pct: number }[],
  base = 10_000_000,
): Holder[] {
  return entries.map((e) => ({ name: e.name, shares: (e.pct / 100) * base }));
}

/**
 * Model a priced round. Returns the post-round cap table and per-holder dilution.
 *
 * Maths (with pre-money option pool of post-round fraction q):
 *   S0 = existing fully-diluted shares
 *   postMoney = preMoney + newMoney
 *   newPoolShares P = q·postMoney·S0 / (preMoney − q·postMoney)
 *   pricePerShare p = preMoney / (S0 + P)
 *   investorShares I = newMoney / p
 *   postShares = S0 + P + I
 */
export function modelRound(holders: Holder[], inputs: RoundInputs): RoundResult {
  const { preMoney, newMoney } = inputs;
  const q = inputs.optionPoolTargetPct ?? 0;
  const investorName = inputs.investorName ?? 'New Investors';
  const S0 = totalShares(holders);
  const postMoney = preMoney + newMoney;

  if (preMoney <= 0 || S0 <= 0) {
    throw new Error('preMoney and existing shares must be positive');
  }

  // New option pool shares (carved pre-money). Guard the degenerate case where
  // the requested pool would consume the entire pre-money.
  let newPoolShares = 0;
  if (q > 0) {
    const denom = preMoney - q * postMoney;
    if (denom <= 0) throw new Error('option pool target too large for this round');
    newPoolShares = (q * postMoney * S0) / denom;
  }

  const pricePerShare = preMoney / (S0 + newPoolShares);
  const investorShares = newMoney / pricePerShare;
  const postShares = S0 + newPoolShares + investorShares;

  const before = withPct(holders);

  const afterHolders: Holder[] = [...holders];
  if (newPoolShares > 0) afterHolders.push({ name: 'Option Pool (new)', shares: newPoolShares });
  afterHolders.push({ name: investorName, shares: investorShares });
  const after = afterHolders.map((h) => ({
    name: h.name,
    shares: h.shares,
    pct: h.shares / postShares,
  }));

  const beforeByName = new Map(before.map((r) => [r.name, r.pct]));
  const dilution = before.map((r) => {
    const afterPct = (holders.find((h) => h.name === r.name)!.shares) / postShares;
    return { name: r.name, pointsLost: (beforeByName.get(r.name)! - afterPct) * 100 };
  });

  return {
    postMoney,
    pricePerShare,
    investorShares,
    newPoolShares,
    postShares,
    before,
    after,
    dilution,
  };
}

/**
 * Cactus's ownership and stake value after a modelled round.
 * @param holderName the cap-table line representing Cactus.
 */
export function stakeAfterRound(
  result: RoundResult,
  holderName: string,
): { pct: number; valueAtPost: number } | null {
  const row = result.after.find((r) => r.name === holderName);
  if (!row) return null;
  return { pct: row.pct, valueAtPost: row.pct * result.postMoney };
}
