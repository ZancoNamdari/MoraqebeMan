// Fixed-order categorical palette + status colors for the analytics
// dashboards (caregivers/patients/staff/financial). Values come from the
// dataviz skill's validated reference palette — do not invent new hexes
// here, and do not cycle/reassign the categorical order.

/**
 * Categorical series colors, in FIXED assignment order. Always assign
 * index 0 to the first series, index 1 to the second, etc. — never pick
 * "whatever looks nice" or cycle back to index 0 once you run out of
 * distinct entities to encode.
 */
export const CATEGORICAL_PALETTE: string[] = [
  "#2a78d6", // 1. blue
  "#eb6834", // 2. orange
  "#1baf7a", // 3. aqua
  "#eda100", // 4. yellow
  "#e87ba4", // 5. magenta
  "#008300", // 6. green
  "#4a3aa7", // 7. violet
  "#e34948", // 8. red
]

/**
 * Status colors are reserved for true state (approved/pending/rejected,
 * good/warning/serious/critical style badges) — never reused as a
 * generic chart series color.
 */
export const STATUS_PALETTE = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
} as const

/** Neutral gray used for the folded "سایر" (other) bucket. */
export const OTHER_BUCKET_COLOR = "#c3c2b7"

/** Chart chrome — gridlines, muted axis/label text, secondary ink. */
export const CHART_CHROME = {
  gridline: "#e1e0d9",
  mutedText: "#898781",
  secondaryInk: "#52514e",
} as const

const OTHER_LABEL = "سایر"

/**
 * Assigns fixed-order categorical colors to a list of items, capping the
 * number of distinct hues at `maxSlots` and folding everything past that
 * into a single gray "سایر" (other) bucket.
 *
 * WHY cap at 4 (not use all 8 categorical colors): a donut/pie is an
 * "all-pairs comparison" chart form — the viewer has to tell EVERY slice
 * apart from EVERY other slice at once, not just neighbor-to-neighbor as
 * in a bar chart. Per the dataviz color-formula method, only the first
 * 3-4 categorical slots survive that all-pairs comparison under
 * colorblind (CVD) simulation with enough separation (Delta E) to stay
 * distinguishable; slots 5-8 are validated for sequential neighbor
 * comparisons (e.g. adjacent bars), not for an all-pairs form like this.
 * So beyond the cap we don't keep assigning hues that would silently
 * become indistinguishable — we fold the tail into one clearly-labeled
 * neutral bucket instead.
 *
 * Caller must pass `items` already sorted descending by value — the
 * function folds whatever is left over (i.e. the smallest items) into
 * the trailing "سایر" bucket, and takes the first `maxSlots - 1` items
 * as their own color plus the folded remainder as the `maxSlots`-th
 * slot. If `items.length <= maxSlots`, every item keeps its own color
 * and nothing is folded.
 */
export function assignCategoricalColors<T extends { value: number }>(
  items: T[],
  maxSlots = 4
): (T & { color: string; label?: string })[] {
  if (items.length <= maxSlots) {
    return items.map((item, idx) => ({
      ...item,
      color: CATEGORICAL_PALETTE[idx % CATEGORICAL_PALETTE.length],
    }))
  }

  const ownColorCount = maxSlots - 1
  const head = items.slice(0, ownColorCount).map((item, idx) => ({
    ...item,
    color: CATEGORICAL_PALETTE[idx % CATEGORICAL_PALETTE.length],
  }))

  const tail = items.slice(ownColorCount)
  const foldedValue = tail.reduce((sum, item) => sum + item.value, 0)
  // Preserve whatever shape T has for the "other" bucket by spreading the
  // last tail item, then overwriting value/label/color. This keeps the
  // return type consistent without requiring callers to pass a `label`.
  const other = {
    ...tail[tail.length - 1],
    value: foldedValue,
    label: OTHER_LABEL,
    color: OTHER_BUCKET_COLOR,
  } as T & { color: string; label?: string }

  return [...head, other]
}
