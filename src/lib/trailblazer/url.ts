export function validateTrailblazerProfileUrl(value: unknown): boolean {
  try {
    const parsed = new URL(String(value || '').trim());

    return (
      parsed.protocol === 'https:' &&
      parsed.hostname === 'www.salesforce.com' &&
      /^\/trailblazer\/[a-z0-9]+\/?$/i.test(parsed.pathname) &&
      !/^\/trailblazer\/profile\/?$/i.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}
