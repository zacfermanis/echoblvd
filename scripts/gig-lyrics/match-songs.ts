import { normalizeSongName } from './parse-setlist';

export interface LyricsFile {
	id: string;
	name: string;
}

export interface SongMatchResult {
	song: string;
	file: LyricsFile | null;
	candidates: string[];
}

function stripDocExtension(name: string): string {
	return name.replace(/\.(gdoc|docx?)$/i, '').trim();
}

function splitTitleAndArtist(name: string): { title: string; artist: string | null } {
	const normalized = normalizeSongName(stripDocExtension(name));
	const dashParts = normalized.split(/\s[-–—]\s/);

	if (dashParts.length <= 1) {
		return { title: normalized, artist: null };
	}

	return {
		title: dashParts[0].trim(),
		artist: dashParts.slice(1).join(' - ').trim() || null,
	};
}

function songLookupKeys(song: string): string[] {
	const normalized = normalizeSongName(song);
	const keys = new Set<string>([normalized]);

	const dashParts = normalized.split(/\s[-–—]\s/);
	if (dashParts.length > 1) {
		keys.add(dashParts[dashParts.length - 1].trim());
		keys.add(dashParts[0].trim());
	}

	return [...keys].filter(Boolean);
}

function addToIndex(index: Map<string, LyricsFile[]>, key: string, file: LyricsFile): void {
	const existing = index.get(key) ?? [];
	existing.push(file);
	index.set(key, existing);
}

function collectMatchesForKey(
	key: string,
	filesByFullName: Map<string, LyricsFile[]>,
	filesByTitle: Map<string, LyricsFile[]>,
): LyricsFile[] {
	const matches = new Map<string, LyricsFile>();

	for (const file of filesByFullName.get(key) ?? []) {
		matches.set(file.id, file);
	}

	for (const file of filesByTitle.get(key) ?? []) {
		matches.set(file.id, file);
	}

	for (const [fullName, files] of filesByFullName.entries()) {
		if (fullName.startsWith(`${key} -`) || fullName.startsWith(`${key}–`)) {
			for (const file of files) matches.set(file.id, file);
		}
	}

	return [...matches.values()];
}

export function matchSongToLyricsFile(
	song: string,
	lyricsFiles: LyricsFile[],
): SongMatchResult {
	const filesByFullName = new Map<string, LyricsFile[]>();
	const filesByTitle = new Map<string, LyricsFile[]>();

	for (const file of lyricsFiles) {
		const { title, artist } = splitTitleAndArtist(file.name);
		addToIndex(filesByFullName, normalizeSongName(stripDocExtension(file.name)), file);
		addToIndex(filesByTitle, title, file);
		if (artist) addToIndex(filesByFullName, artist, file);
	}

	const matchedFiles = new Map<string, LyricsFile>();
	for (const key of songLookupKeys(song)) {
		for (const file of collectMatchesForKey(key, filesByFullName, filesByTitle)) {
			matchedFiles.set(file.id, file);
		}
	}

	const matches = [...matchedFiles.values()];
	if (matches.length === 1) {
		return { song, file: matches[0], candidates: [] };
	}

	if (matches.length > 1) {
		return {
			song,
			file: null,
			candidates: matches.map(match => match.name),
		};
	}

	return { song, file: null, candidates: [] };
}

export function matchSetlistToLyrics(
	songs: string[],
	lyricsFiles: LyricsFile[],
): SongMatchResult[] {
	return songs.map(song => matchSongToLyricsFile(song, lyricsFiles));
}
