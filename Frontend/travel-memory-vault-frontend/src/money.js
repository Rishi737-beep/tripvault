// Work in minor units (paise/cents) so float errors never creep into totals.
// The backend must still use BigDecimal and be the source of truth.
export const toMinor = (v) => Math.round(Number(v) * 100);
export const fmt = (minor, currency = "INR") => {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${String(currency).slice(0, 3)}`;
  }
};
export const fmtDate = (d) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";
