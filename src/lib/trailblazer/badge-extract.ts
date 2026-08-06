import type { StructuredBadgeEntry } from './types';

export function normalizeBadgeToken(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function parseBadgeEarnedDateFromEpoch(value: number): Date | null {
  const epoch = value > 1e12 ? value : value * 1000;
  const date = new Date(epoch);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseBadgeEarnedDateFromNumericString(raw: string): Date | null {
  const numericDateMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!numericDateMatch) return null;
  const month = Number.parseInt(numericDateMatch[1], 10);
  const day = Number.parseInt(numericDateMatch[2], 10);
  const yearRaw = Number.parseInt(numericDateMatch[3], 10);
  const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseBadgeEarnedDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return parseBadgeEarnedDateFromEpoch(value);
  const raw = String(value || '').trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  return parseBadgeEarnedDateFromNumericString(raw);
}

export function pickFirstEarnedDateCandidate(...candidates: unknown[]): Date | null {
  for (const candidate of candidates) {
    const parsed = parseBadgeEarnedDate(candidate);
    if (parsed) return parsed;
  }
  return null;
}

function parsePointsFromJsonCandidates(...candidates: unknown[]): number | null {
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined) continue;
    const match = String(candidate).match(/\d+/);
    if (!match) continue;
    const parsed = Number.parseInt(match[0], 10);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return null;
}

function resolveBadgeTitle(value: Record<string, unknown>): unknown {
  return (
    value.title ||
    value.badgeTitle ||
    value.badgeName ||
    value.name ||
    value.displayName ||
    value.label
  );
}

function traverseBadgeJsonArray(arr: unknown[], rows: StructuredBadgeEntry[], depth: number): void {
  for (const entry of arr) {
    extractBadgeRowsFromUnknownJson(entry, rows, depth + 1);
    if (rows.length >= 80) break;
  }
}

function isBadgeJsonTraversalDone(depth: number, rows: StructuredBadgeEntry[], value: unknown): boolean {
  return depth > 7 || rows.length >= 80 || value === null || value === undefined;
}

export function extractBadgeRowsFromUnknownJson(
  value: unknown,
  rows: StructuredBadgeEntry[] = [],
  depth = 0
): StructuredBadgeEntry[] {
  if (isBadgeJsonTraversalDone(depth, rows, value)) return rows;

  if (Array.isArray(value)) {
    traverseBadgeJsonArray(value, rows, depth);
    return rows;
  }

  if (typeof value !== 'object') return rows;

  const record = value as Record<string, unknown>;
  const normalize = (input: unknown) => String(input || '').replace(/\s+/g, ' ').trim();
  const normalizeTitle = (input: unknown) => normalize(input).toLowerCase().replace(/[^a-z0-9]/g, '');

  const title = normalize(resolveBadgeTitle(record));
  const points = parsePointsFromJsonCandidates(
    record.points,
    record.pointValue,
    record.badgePoints,
    record.totalPoints,
    record.score,
    record.xp,
    record.value
  );
  const earnedDate = pickFirstEarnedDateCandidate(
    record.dateEarned,
    record.earnedDate,
    record.completedDate,
    record.completedAt,
    record.completionDate,
    record.awardedAt,
    record.awardedDate,
    record.updatedAt,
    record.createdAt,
    record.lastModifiedDate
  );

  if (title) {
    rows.push({
      title,
      normalizedTitle: normalizeTitle(title),
      points,
      earnedDateIso: earnedDate ? earnedDate.toISOString() : null,
      source: 'network_json',
    });
  }

  for (const nestedValue of Object.values(record)) {
    if (rows.length >= 80) break;
    extractBadgeRowsFromUnknownJson(nestedValue, rows, depth + 1);
  }

  return rows;
}

function decodeHtmlEntities(value: string): string {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function cleanBadgeFieldText(raw: string): string {
  return decodeHtmlEntities(String(raw || '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

export function parsePointsText(text: unknown): number | null {
  const match = String(text || '')
    .replace(/,/g, '')
    .match(/\d+/);
  if (!match) return null;
  const parsed = Number.parseInt(match[0], 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function applyBadgeDateOrPoints(
  label: string,
  text: string,
  result: { points: number | null; earnedDateIso: string | null }
): void {
  const isDate =
    label.includes('date earned') ||
    label.includes('earned date') ||
    label.includes('completed date');

  if (isDate && !result.earnedDateIso) {
    const date = parseBadgeEarnedDate(text);
    if (date) result.earnedDateIso = date.toISOString();
  }

  if (label.includes('point') && result.points === null) {
    result.points = parsePointsText(text);
  }
}

function extractFieldsFromSalesforceClasses(
  localWindow: string,
  result: { points: number | null; earnedDateIso: string | null }
): void {
  const pattern =
    /<([a-z0-9-]+)[^>]*class="[^"]*badge-detail-(term|definition)[^"]*"[^>]*>([\s\S]*?)<\/\1>/gi;
  let currentLabel: string | null = null;

  for (const match of localWindow.matchAll(pattern)) {
    const fieldType = String(match[2] || '').toLowerCase();
    const text = cleanBadgeFieldText(match[3]);
    if (!text) continue;
    if (fieldType === 'term') {
      currentLabel = text.toLowerCase();
      continue;
    }
    if (!currentLabel) continue;
    applyBadgeDateOrPoints(currentLabel, text, result);
    currentLabel = null;
  }
}

function extractFieldsFromDtDd(
  localWindow: string,
  result: { points: number | null; earnedDateIso: string | null }
): void {
  const pattern = /<dt[^>]*>([\s\S]*?)<\/dt>[\s\S]{0,200}?<dd[^>]*>([\s\S]*?)<\/dd>/gi;

  for (const match of localWindow.matchAll(pattern)) {
    const label = cleanBadgeFieldText(match[1]).toLowerCase();
    const text = cleanBadgeFieldText(match[2]);
    if (!text) continue;
    applyBadgeDateOrPoints(label, text, result);
  }
}

function extractBadgeFieldsFromWindow(localWindow: string): {
  points: number | null;
  earnedDateIso: string | null;
} {
  const result = { points: null as number | null, earnedDateIso: null as string | null };
  extractFieldsFromSalesforceClasses(localWindow, result);
  if (result.points === null && !result.earnedDateIso) {
    extractFieldsFromDtDd(localWindow, result);
  }
  return result;
}

export function extractStructuredTrailblazerBadgeEntries(html: string): StructuredBadgeEntry[] {
  const source = String(html || '');
  const seen = new Map<string, StructuredBadgeEntry>();

  const collectFromMatches = (matches: RegExpMatchArray[]) => {
    for (let index = 0; index < matches.length; index += 1) {
      const match = matches[index];
      const titleRaw = decodeHtmlEntities(String(match[1] || '').replace(/<[^>]+>/g, ' '))
        .replace(/\s+/g, ' ')
        .trim();
      const normalizedTitle = normalizeBadgeToken(titleRaw);

      if (
        !normalizedTitle ||
        normalizedTitle.length < 4 ||
        titleRaw.length > 150 ||
        seen.has(normalizedTitle)
      ) {
        continue;
      }

      const start = Number(match.index) || 0;
      const nextStart =
        index < matches.length - 1
          ? Number(matches[index + 1].index) || source.length
          : Math.min(source.length, start + 5000);
      const localWindow = source.slice(start, Math.min(source.length, nextStart));
      const { points, earnedDateIso } = extractBadgeFieldsFromWindow(localWindow);

      seen.set(normalizedTitle, {
        title: titleRaw,
        normalizedTitle,
        points,
        earnedDateIso,
      });
    }
  };

  const primaryMatches = Array.from(
    source.matchAll(/<a[^>]*class="[^"]*badge-detail-link[^"]*"[^>]*>([\s\S]*?)<\/a>/gi)
  );
  collectFromMatches(primaryMatches);

  const hrefMatches = Array.from(
    source.matchAll(
      /<a[^>]*href="[^"]*(?:\/trailhead\/|trailhead\.salesforce\.com)[^"]*"[^>]*>([\s\S]*?)<\/a>/gi
    )
  );
  collectFromMatches(hrefMatches);

  return Array.from(seen.values());
}

export function dedupeByNormalizedTitle(rows: StructuredBadgeEntry[]): StructuredBadgeEntry[] {
  const deduped: StructuredBadgeEntry[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const key = String(row?.normalizedTitle || '').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }

  return deduped;
}

export function mergeStructuredBadgeEntries(
  networkEntries: StructuredBadgeEntry[],
  domEntries: StructuredBadgeEntry[],
  mhtmlEntries: StructuredBadgeEntry[]
): StructuredBadgeEntry[] {
  const mergedMap = new Map<string, StructuredBadgeEntry>();

  for (const entry of networkEntries) {
    if (entry?.normalizedTitle) mergedMap.set(entry.normalizedTitle, entry);
  }

  for (const entry of [...domEntries, ...mhtmlEntries]) {
    if (entry?.normalizedTitle) mergedMap.set(entry.normalizedTitle, entry);
  }

  return Array.from(mergedMap.values());
}

export function detectLooksLikeJson(contentType: string, text: string): boolean {
  if (contentType.includes('application/json')) return true;
  if (contentType.includes('application/graphql-response+json')) return true;
  return /^[\s\n\r]*[\[{]/.test(text);
}
