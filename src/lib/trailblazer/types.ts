export interface TrailblazerBrowserProfile {
  name: string;
  userAgent: string;
  acceptLanguage: string;
  timezoneId: string;
}

export interface StructuredBadgeEntry {
  title: string;
  normalizedTitle: string;
  points: number | null;
  earnedDateIso: string | null;
  source?: string;
}

export interface NetworkCaptureDiagnostics {
  responseCount: number;
  jsonResponseCount: number;
  candidateJsonResponseCount: number;
  parsedBadgeRowsBeforeDedup: number;
  parseErrors: number;
}

export interface BrowserRuntimeDiagnostics {
  consoleErrors: Array<{ type: string; text: string }>;
  pageErrors: string[];
}

export interface PagePresenceDiagnostics {
  mainContentExists: boolean;
  mainContentChildCount: number;
  mainContentTextLength: number;
  bodyTextLength: number;
  badgeDetailLinkCount: number;
  badgeContainerCount: number;
  buttonCount: number;
  showMoreTextCount: number;
  badgeTextCount: number;
  pointsTextCount: number;
  shadowRootCount: number;
  shadowButtonCount: number;
  shadowShowMoreTextCount: number;
  shadowBadgeDetailLinkCount: number;
  shadowTextLength: number;
}

export interface ShowMoreRoundSummary {
  round: number;
  candidateCounts: Record<string, number>;
  visibleCandidateCount: number;
  clicked: boolean;
  shadowRootCount?: number;
}

export interface HydrationDiagnostics {
  waitedForMainContentMs: number;
  waitForMainContentSucceeded: boolean;
  waitForMainContentChildrenSucceeded?: boolean;
  waitedForMainContentChildrenMs?: number;
  hydrationProbeRounds: number;
  preScanProbe: PagePresenceDiagnostics | null;
  postScanProbe: PagePresenceDiagnostics | null;
  scanRoundSummaries: ShowMoreRoundSummary[];
}

export interface ScrapeTimelineEntry {
  phase: string;
  elapsedMs: number;
  [key: string]: unknown;
}

export interface ScrapePresenceDiagnostics extends HydrationDiagnostics {
  scrapeTimeline: ScrapeTimelineEntry[];
  domStructuredBadgeEntryCount: number;
  networkStructuredBadgeEntryCount: number;
  mhtmlStructuredBadgeEntryCount: number;
  cdpMhtmlCaptured: boolean;
  networkCaptureDiagnostics: NetworkCaptureDiagnostics;
  browserRuntimeDiagnostics: BrowserRuntimeDiagnostics;
}

export interface TrailblazerScrapeSuccess {
  ok: true;
  html: string;
  showMoreClicks: number;
  attemptedShowMore: boolean;
  showMoreScanRounds: number;
  showMoreCandidateCount: number;
  structuredBadgeEntries: StructuredBadgeEntry[];
  scrapePresenceDiagnostics: ScrapePresenceDiagnostics | null;
  browserMode: string | null;
  browserProfile: string;
  launchDiagnostics: string[];
  accessDeniedHtml?: boolean;
}

export interface TrailblazerScrapeFailure {
  ok: false;
  reason: string;
  launchDiagnostics?: string[];
}

export type TrailblazerScrapeResult = TrailblazerScrapeSuccess | TrailblazerScrapeFailure;
