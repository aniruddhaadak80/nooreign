/**
 * Date formatting shared by the chronicle. Kept local rather than in the design
 * system because it encodes the atlas's BCE convention, which is a product
 * decision rather than a presentational one.
 */
export function formatYear(year: number): string {
  if (year < 0) return `${Math.abs(year)} BCE`;
  if (year === 0) return "1 BCE / 1 CE";
  return `${year} CE`;
}

export function formatShortYear(year: number): string {
  return year < 0 ? `${Math.abs(year)} BCE` : `${year}`;
}

export function formatSpan(start: number, end: number): string {
  if (end <= start) return formatShortYear(start);
  return `${formatShortYear(start)} – ${formatShortYear(end)}`;
}
