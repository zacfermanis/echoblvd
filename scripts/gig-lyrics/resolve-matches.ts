import type { LyricsFile, SongMatchResult } from './match-songs';
import { promptSelection } from './auth';

export async function resolveUnresolvedMatches(
	matches: SongMatchResult[],
	lyricsFiles: LyricsFile[],
): Promise<SongMatchResult[]> {
	const resolved: SongMatchResult[] = [];

	for (const match of matches) {
		if (match.file) {
			resolved.push(match);
			continue;
		}

		if (match.candidates.length > 0) {
			console.log(
				`\nMultiple lyrics files matched "${match.song}": ${match.candidates.join(', ')}`,
			);
		} else {
			console.log(`\nNo lyrics file matched "${match.song}".`);
		}

		const selected = await promptSelection(lyricsFiles, `lyrics file for "${match.song}"`, {
			alwaysPrompt: true,
			heading: 'Lyrics folder files:',
		});

		resolved.push({
			...match,
			file: selected,
			candidates: [],
		});
		console.log(`  → Using "${selected.name}"`);
	}

	return resolved;
}
