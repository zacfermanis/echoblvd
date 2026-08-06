export function logTrailblazerValidation(event: string, details: Record<string, unknown> = {}): void {
  console.log('[trailblazer-validation]', {
    event,
    timestamp: new Date().toISOString(),
    ...details,
  });
}
