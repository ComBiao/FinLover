export type ChipTone = {
  className?: string;
  style?: { backgroundColor: string; color: string };
  /** A small, solid-color indicator (e.g. a filter dropdown's dot) matching this tone. */
  dotClassName?: string;
  dotStyle?: { backgroundColor: string };
};

/**
 * A curated preset's soft chip background+text pair and its solid dot color.
 * Both strings must be written out literally (not built by string-splitting
 * `chip` at runtime) — Tailwind only generates CSS for class names it can
 * see verbatim in source, so a dot class assembled dynamically from `chip`
 * (e.g. turning "text-success" into "bg-success") silently renders as a
 * transparent dot unless "bg-success" also happens to appear literally
 * somewhere else in the scanned source.
 */
export type ChipPreset = { chip: string; dot: string };

const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** `#abc` -> `#aabbcc`, so short and long hex forms parse the same way. */
function expandShortHex(hex: string) {
  return hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex;
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = expandShortHex(hex);
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Deterministic string -> [0, modulo) index, so the same key always lands on the same slot. */
function hashStringToIndex(key: string, modulo: number) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % modulo;
}

/** On-theme rotation used when a key has neither a custom color nor a curated preset. */
const FALLBACK_CHIP_STYLES: ChipPreset[] = [
  { chip: "bg-chart-1/15 text-chart-1", dot: "bg-chart-1" },
  { chip: "bg-chart-2/15 text-chart-2", dot: "bg-chart-2" },
  { chip: "bg-chart-3/15 text-chart-3", dot: "bg-chart-3" },
  { chip: "bg-chart-4/15 text-chart-4", dot: "bg-chart-4" },
  { chip: "bg-chart-5/15 text-chart-5", dot: "bg-chart-5" },
];

/** Curated on-theme presets, shared by `TransactionTable` and the Wallet/Category filter selectors. */
export const WALLET_TYPE_STYLES: Record<string, ChipPreset> = {
  cash: { chip: "bg-chart-1/15 text-chart-1", dot: "bg-chart-1" },
  savings: { chip: "bg-success-bg text-success", dot: "bg-success" },
  bank: { chip: "bg-chart-2/15 text-chart-2", dot: "bg-chart-2" },
  credit: { chip: "bg-chart-3/15 text-chart-3", dot: "bg-chart-3" },
};

export const CATEGORY_STYLES: Record<string, ChipPreset> = {
  "food-drink": { chip: "bg-chart-1/15 text-chart-1", dot: "bg-chart-1" },
  transport: { chip: "bg-chart-2/15 text-chart-2", dot: "bg-chart-2" },
  shopping: { chip: "bg-chart-3/15 text-chart-3", dot: "bg-chart-3" },
  gifts: { chip: "bg-chart-4/15 text-chart-4", dot: "bg-chart-4" },
  salary: { chip: "bg-success-bg text-success", dot: "bg-success" },
  freelance: { chip: "bg-primary/10 text-primary", dot: "bg-primary" },
  investment: { chip: "bg-accent/10 text-accent", dot: "bg-accent" },
};

/**
 * Best-effort dot class for a *custom, runtime-provided* Tailwind class
 * string (case 2 below) — pulls a `text-*` token out and swaps it to `bg-*`.
 * Unlike the curated presets above, this can't be made fully reliable: a
 * category/wallet's custom `color` string comes from data, not source code,
 * so Tailwind's build-time scanner will only have generated CSS for it if
 * that exact class happens to be used (or safelisted) elsewhere already —
 * otherwise both this derived dot and the chip's own `color` className will
 * silently render with no background, which is an inherent limitation of
 * accepting freeform Tailwind classes from a database rather than a fixed,
 * safelisted palette.
 */
function deriveDotClassName(className: string) {
  const textToken = className.split(/\s+/).find((token) => token.startsWith("text-"));
  return textToken ? `bg-${textToken.slice("text-".length)}` : undefined;
}

/**
 * Resolves a chip's visual tone, in priority order:
 * 1. An explicit `color` on the record itself — this is how the data will
 *    arrive once `/api/categories` and `/api/wallets` are live (see
 *    `ICategory.color` in `src/models/Category.ts`). A hex value
 *    (`#RRGGBB`/`#RGB`) becomes an inline soft-tint background with the
 *    full color used for the text/icon; any other non-empty string is
 *    treated as a ready-made Tailwind class string and used as-is.
 * 2. A curated on-theme preset keyed by `presetKey` (a category id or
 *    wallet type), supplied by the caller.
 * 3. A deterministic hash of `presetKey` into the chart-1..5 tokens, so a
 *    brand-new category/wallet with neither a `color` nor a preset still
 *    gets a distinct, on-theme color instead of a plain gray chip.
 */
export function resolveChipTone(
  color: string | undefined,
  presets: Record<string, ChipPreset>,
  presetKey: string
): ChipTone {
  if (color) {
    if (HEX_COLOR_PATTERN.test(color)) {
      return {
        style: { backgroundColor: hexToRgba(color, 0.15), color },
        dotStyle: { backgroundColor: color },
      };
    }
    return { className: color, dotClassName: deriveDotClassName(color) };
  }

  const preset =
    presets[presetKey] ??
    FALLBACK_CHIP_STYLES[hashStringToIndex(presetKey, FALLBACK_CHIP_STYLES.length)];

  return { className: preset.chip, dotClassName: preset.dot };
}
