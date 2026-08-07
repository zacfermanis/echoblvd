const NUMBERED_LINE = /^\s*(?:\d+[\.)]\s*|-+\s*|\*\s+)(.+)\s*$/;
const SETLIST_HEADER = /^(set\s*list|setlist|gig|date|venue|location)\b/i;
const SET_HEADER =
	/^set\s*(?:#?\s*\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*$/i;
const SET_HEADER_ALT =
	/^(?:first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th)\s+set\s*$/i;

export function normalizeSongName(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s\-–—]/gu, '')
		.replace(/\s+/g, ' ')
		.trim();
}

export function isSetHeaderLine(line: string): boolean {
	const trimmed = line.trim();
	return SET_HEADER.test(trimmed) || SET_HEADER_ALT.test(trimmed);
}

export function parseSetlistLines(rawText: string): string[] {
	const songs: string[] = [];
	let skippedTitleLine = false;

	for (const rawLine of rawText.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line) continue;

		if (!skippedTitleLine) {
			skippedTitleLine = true;
			continue;
		}

		if (SETLIST_HEADER.test(line)) continue;
		if (isSetHeaderLine(line)) continue;
		if (/^[-=_]{3,}$/.test(line)) continue;

		const numbered = line.match(NUMBERED_LINE);
		const song = (numbered?.[1] ?? line).trim();
		if (!song) continue;
		if (isSetHeaderLine(song)) continue;

		songs.push(song);
	}

	return songs;
}
