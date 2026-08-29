export type EraEvent = {
  year: string;
  title: string;
  detail: string;
};

const ADMINISTRATIVE_HISTORY = /(?:heritage|register|listed|gazett|classification)/i;
const SIGNIFICANT_EVENT =
  /(?:built|construct|complet|open|establish|found|inaugurat|design|rebuild|renovat|expand|demolish|destroy|fire|flood|war|riot|strike|visit|move|relocat|convert|close|launch|begin|finish)/i;

function eventTitle(sentence: string, range?: [string, string]): string {
  if (range && /built|construct|complet/i.test(sentence)) return `Built ${range[0]}–${range[1]}`;
  if (/fire|destroy/i.test(sentence)) return 'A defining fire';
  if (/open|inaugurat/i.test(sentence)) return 'Opened to the public';
  if (/built|construct|complet/i.test(sentence)) return 'Construction completed';
  if (/establish|found/i.test(sentence)) return 'Place established';
  if (/rebuild|renovat|expand/i.test(sentence)) return 'The place transformed';
  if (/demolish|close/i.test(sentence)) return 'An era ended';
  if (/war|riot|strike/i.test(sentence)) return 'A major local event';
  return 'A moment in its history';
}

/**
 * Turns prose into a small set of visual, event-backed eras. Administrative
 * dates such as heritage-register listings are deliberately excluded.
 */
export function extractSignificantEraEvents(extract?: string): EraEvent[] {
  if (!extract?.trim()) return [];
  const currentYear = new Date().getFullYear();
  const sentences = extract
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])(?<!\b[A-Z]\.)\s+(?=[A-Z])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const events: EraEvent[] = [];

  for (const sentence of sentences) {
    if (ADMINISTRATIVE_HISTORY.test(sentence) || !SIGNIFICANT_EVENT.test(sentence)) continue;
    const years = [...sentence.matchAll(/\b(1[7-9]\d{2}|20\d{2})\b/g)]
      .map((match) => match[1]!)
      .filter((year) => Number(year) <= currentYear - 5);
    if (years.length === 0) continue;

    const rangeMatch = sentence.match(
      /\b(1[7-9]\d{2}|20\d{2})\s+(?:to|until|–|—|-)\s+(1[7-9]\d{2}|20\d{2})\b/i,
    );
    const range = rangeMatch ? ([rangeMatch[1]!, rangeMatch[2]!] as [string, string]) : undefined;
    const year = range?.[1] ?? years[0]!;
    if (events.some((event) => event.year === year)) continue;
    events.push({ year, title: eventTitle(sentence, range), detail: sentence });
  }

  return events.slice(0, 3);
}
