function decodeQuotedPrintable(value: string): string {
  const normalized = String(value || '').replace(/=\r?\n/g, '');
  const bytes: number[] = [];

  for (let index = 0; index < normalized.length; index += 1) {
    const current = normalized[index];

    if (current === '=' && /^[0-9A-Fa-f]{2}$/.test(normalized.slice(index + 1, index + 3))) {
      bytes.push(Number.parseInt(normalized.slice(index + 1, index + 3), 16));
      index += 2;
      continue;
    }

    bytes.push(current.charCodeAt(0));
  }

  return Buffer.from(bytes).toString('utf8');
}

function decodeMimePart(headers: string, body: string): string {
  if (/content-transfer-encoding:\s*base64/i.test(headers)) {
    const compact = body.replace(/\s+/g, '');
    try {
      return Buffer.from(compact, 'base64').toString('utf8');
    } catch {
      return '';
    }
  }

  if (/content-transfer-encoding:\s*quoted-printable/i.test(headers)) {
    return decodeQuotedPrintable(body);
  }

  return body;
}

function findHtmlInMhtmlParts(parts: string[]): string | null {
  for (const part of parts) {
    const split = part.split(/\r?\n\r?\n/);
    if (split.length < 2) continue;
    const headers = String(split.shift() || '');
    const body = split.join('\n\n');
    if (!/content-type:\s*text\/html/i.test(headers)) continue;
    return decodeMimePart(headers, body);
  }

  return null;
}

export function extractHtmlFromMhtmlRawContent(rawContent: string): string {
  const source = String(rawContent || '');
  if (!source) return '';

  const boundaryMatch = source.match(/boundary="?([^";\r\n]+)"?/i);
  const boundary = boundaryMatch?.[1] ? `--${boundaryMatch[1]}` : null;

  const fallbackDecode = () => {
    if (/<html[\s>]/i.test(source)) return source;
    const decoded = decodeQuotedPrintable(source);
    return /<html[\s>]/i.test(decoded) ? decoded : '';
  };

  if (!boundary) return fallbackDecode();
  const found = findHtmlInMhtmlParts(source.split(boundary));
  return found !== null ? found : fallbackDecode();
}
