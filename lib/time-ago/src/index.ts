export const INTERVALS = {
  year: 31536000,
  month: 2592000,
  week: 604800,
  day: 86400,
  hour: 3600,
  minute: 60,
  second: 1,
} as const;

export function timeAgo(input: number | string | Date, locales: Intl.LocalesArgument = "en") {
  if (!input) throw new TypeError("missing input type passed into timeAgo function.");
  if (!(typeof input === "string" || typeof input === "number" || input instanceof Date))
    throw new TypeError("invalid input type passed into timeAgo function.");

  const now = Date.now();
  const date = typeof input === "number" ? new Date(input) : new Date(input);
  const diff: number = (date.getTime() - now) / 1000; // difference in seconds

  for (const _key in INTERVALS) {
    const key = _key as keyof typeof INTERVALS;
    const interval = INTERVALS[key];
    if (Math.abs(diff) >= interval || key === "second") {
      const rtf = new Intl.RelativeTimeFormat(locales, { numeric: "auto" });
      return rtf.format(Math.round(diff / interval), key);
    }
  }
}

export default timeAgo;
