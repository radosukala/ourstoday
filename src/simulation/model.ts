/**
 * The arithmetic.
 *
 * Deliberately simple and deliberately pure: every figure comes from
 * `data.ts`, and this file only multiplies and adds. If a number on the page
 * surprises someone, they should be able to follow it back to a published
 * source in two steps — the rate here, the filing there.
 *
 * What this model does NOT do, and must never do:
 *   - forecast what OURS would charge (undecided; members decide it);
 *   - promise anyone a payment, a dividend or a share;
 *   - compound anything over multiple years to make the total look larger.
 */
import { PRODUCTS, type Arpu, type Product, type TakeRate } from "./data";

export interface Selection {
  slug: string;
  /** Money the person moves through it per year, in their own currency. */
  amount: number;
}

export interface LineResult {
  product: Product;
  /** What the platform takes or earns from this person in a year. */
  taken: number;
  /** The same figure at the product's lower published tier, where one exists. */
  takenLow: number | null;
  /** True when the figure is revenue from attention rather than a fee paid. */
  isAttention: boolean;
}

export interface SimulationResult {
  lines: LineResult[];
  /** Annual total across everything selected. */
  total: number;
  /** The same total using every available lower tier. */
  totalLow: number;
  /** Fees the person pays, separated from revenue their attention generates. */
  paidInFees: number;
  earnedFromAttention: number;
  /** Money the person moved through the fee-charging products in a year. */
  moved: number;
  /**
   * Of every 100 units that passed through them, how many they kept.
   *
   * This replaced a "days a year you work for them" figure, which divided
   * fees by an assumed salary and produced 485 working days in a year for
   * anyone whose fees exceeded that salary. A visibly impossible number
   * sitting beside carefully sourced ones discredits the sourced ones.
   * A blended take rate cannot exceed 100 and needs no assumed wage.
   */
  keptPerHundred: number;
}

export function productBySlug(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

function isArpu(e: TakeRate | Arpu): e is Arpu {
  return e.kind === "arpu";
}

/** One product's annual cost to one person. */
export function lineFor(product: Product, amount: number): LineResult {
  const e = product.economics;
  if (isArpu(e)) {
    // Attention products do not scale with a number the person types: the
    // figure is what the company reported earning per person, full stop.
    return {
      product,
      taken: e.perYearUsd,
      takenLow: null,
      isAttention: true,
    };
  }
  const safe = Number.isFinite(amount) && amount > 0 ? amount : 0;
  return {
    product,
    taken: safe * e.rate,
    takenLow: e.lowRate === undefined ? null : safe * e.lowRate,
    isAttention: false,
  };
}

export function simulate(selections: Selection[]): SimulationResult {
  const lines: LineResult[] = [];
  for (const s of selections) {
    const product = productBySlug(s.slug);
    if (!product) continue; // An unknown slug is dropped, never guessed at.
    lines.push(lineFor(product, s.amount));
  }
  const total = lines.reduce((sum, l) => sum + l.taken, 0);
  const totalLow = lines.reduce((sum, l) => sum + (l.takenLow ?? l.taken), 0);
  const paidInFees = lines.filter((l) => !l.isAttention).reduce((s, l) => s + l.taken, 0);
  const earnedFromAttention = lines.filter((l) => l.isAttention).reduce((s, l) => s + l.taken, 0);
  const moved = selections.reduce((sum, sel) => {
    const p = productBySlug(sel.slug);
    if (!p || p.economics.kind !== "take") return sum;
    return sum + (Number.isFinite(sel.amount) && sel.amount > 0 ? sel.amount : 0);
  }, 0);
  const keptPerHundred = moved > 0 ? (paidInFees / moved) * 100 : 0;
  return { lines, total, totalLow, paidInFees, earnedFromAttention, moved, keptPerHundred };
}

/** Money, at a length a person would say out loud. */
export function money(value: number, symbol = "$"): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000)
    return symbol + (value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1) + "M";
  if (abs >= 10_000) return symbol + Math.round(value / 1000) + "K";
  if (abs >= 1000) return symbol + (value / 1000).toFixed(1) + "K";
  return symbol + Math.round(value).toLocaleString("en-US");
}

const STATE_SEPARATOR = ",";
const PAIR_SEPARATOR = ":";

/**
 * URL state, so a result can be sent to someone.
 *
 * A shared link that does not reproduce the sender's numbers is not a shared
 * result, it is an advert. Unknown slugs and non-finite amounts are dropped
 * at the parse boundary rather than trusted, because this string arrives from
 * whatever someone pasted.
 */
export function encodeSelections(selections: Selection[]): string {
  return selections
    .filter((s) => productBySlug(s.slug))
    .map((s) => s.slug + PAIR_SEPARATOR + Math.max(0, Math.round(s.amount)))
    .join(STATE_SEPARATOR);
}

export function decodeSelections(raw: string | undefined | null): Selection[] {
  if (!raw) return [];
  const out: Selection[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(STATE_SEPARATOR).slice(0, PRODUCTS.length)) {
    const [slug, rawAmount] = part.split(PAIR_SEPARATOR);
    if (!slug || seen.has(slug) || !productBySlug(slug)) continue;
    const amount = Number.parseInt(rawAmount ?? "", 10);
    if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000_000) continue;
    seen.add(slug);
    out.push({ slug, amount });
  }
  return out;
}

/** What the page opens with, so nobody meets an empty screen. */
export function defaultSelections(): Selection[] {
  return [
    { slug: "social-feed", amount: 1 },
    { slug: "freelance-marketplace", amount: 40_000 },
  ];
}
