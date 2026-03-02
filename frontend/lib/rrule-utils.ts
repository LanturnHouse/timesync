/**
 * Minimal RFC 5545 RRULE builder/parser utilities.
 * We avoid adding rrule.js as a dependency by handling only the common cases.
 */

export type RRuleFreq = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export interface RRuleOptions {
  freq: RRuleFreq;
  interval?: number;
  /** ISO date string YYYY-MM-DD */
  until?: string;
  count?: number;
}

/**
 * Build a simple RFC 5545 RRULE string.
 * Example: buildRRule({ freq: "WEEKLY", interval: 2 }) → "FREQ=WEEKLY;INTERVAL=2"
 */
export function buildRRule(opts: RRuleOptions): string {
  const parts: string[] = [`FREQ=${opts.freq}`];
  if (opts.interval && opts.interval > 1) {
    parts.push(`INTERVAL=${opts.interval}`);
  }
  if (opts.until) {
    // Convert YYYY-MM-DD → YYYYMMDDTHHmmssZ
    const dt = new Date(opts.until + "T23:59:59Z");
    parts.push(`UNTIL=${dt.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`);
  } else if (opts.count) {
    parts.push(`COUNT=${opts.count}`);
  }
  return parts.join(";");
}

/**
 * Parse a simple RRULE string back into options.
 */
export function parseRRule(rrule: string): RRuleOptions | null {
  if (!rrule) return null;
  const map: Record<string, string> = {};
  for (const part of rrule.split(";")) {
    const [key, val] = part.split("=");
    if (key && val !== undefined) map[key.trim()] = val.trim();
  }
  if (!map["FREQ"]) return null;
  const opts: RRuleOptions = { freq: map["FREQ"] as RRuleFreq };
  if (map["INTERVAL"]) opts.interval = parseInt(map["INTERVAL"], 10);
  if (map["UNTIL"]) {
    // Convert YYYYMMDDTHHMMSSZ → YYYY-MM-DD
    const s = map["UNTIL"].replace("Z", "");
    opts.until = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }
  if (map["COUNT"]) opts.count = parseInt(map["COUNT"], 10);
  return opts;
}

export function rruleHumanLabel(rrule: string): string {
  const opts = parseRRule(rrule);
  if (!opts) return "Does not repeat";
  const interval = opts.interval ?? 1;
  const suffixes: Record<RRuleFreq, string[]> = {
    DAILY: ["day", "days"],
    WEEKLY: ["week", "weeks"],
    MONTHLY: ["month", "months"],
    YEARLY: ["year", "years"],
  };
  const [singular, plural] = suffixes[opts.freq];
  const base =
    interval === 1 ? `Every ${singular}` : `Every ${interval} ${plural}`;
  if (opts.until) return `${base} until ${opts.until}`;
  if (opts.count) return `${base} (${opts.count} times)`;
  return base;
}
