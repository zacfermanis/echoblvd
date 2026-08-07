import { loadLocalEnv } from './load-env';

loadLocalEnv();

import { createGoogleClients, getAuthorizedClient, promptOverwrite, promptSelection } from './auth';
import { buildGigLyricsDocument, readSetlistSongs } from './build-gig-doc';
import { listGoogleDocsInFolder, resolveEchoBlvdFolders, findGoogleDocInFolderByName } from './drive';
import { matchSetlistToLyrics } from './match-songs';
import { parseSetlistLines } from './parse-setlist';
import { resolveUnresolvedMatches } from './resolve-matches';

async function main(): Promise<void> {
	console.log('Echo Blvd — Gig Lyrics Builder\n');

	const auth = await getAuthorizedClient();
	const { drive, docs } = createGoogleClients(auth);

	const folders = await resolveEchoBlvdFolders(drive);
	console.log(`Using folders:`);
	console.log(`  Root:     ${folders.echoBlvd.name}${process.env.GOOGLE_DRIVE_ECHOBLVD_FOLDER_ID ? ' (from .env.local)' : ''}`);
	console.log(`  SetLists: ${folders.setLists.name}`);
	console.log(`  Lyrics:   ${folders.lyrics.name}`);
	console.log(`  Gigs:     ${folders.gigs.name}`);

	const setlists = await listGoogleDocsInFolder(drive, folders.setLists.id);
	const selectedSetlist = await promptSelection(setlists, 'setlist');

	const rawSetlist = await readSetlistSongs(drive, selectedSetlist.id);
	const songs = parseSetlistLines(rawSetlist);

	if (songs.length === 0) {
		throw new Error(
			`No songs found in "${selectedSetlist.name}". Add one song title per line.`,
		);
	}

	console.log(`\nSetlist songs (${songs.length}):`);
	songs.forEach((song, index) => {
		console.log(`  ${index + 1}. ${song}`);
	});

	const lyricsFiles = await listGoogleDocsInFolder(drive, folders.lyrics.id);
	let matches = matchSetlistToLyrics(songs, lyricsFiles);

	console.log('\nLyrics matches:');
	for (const match of matches) {
		if (match.file) {
			console.log(`  ✓ ${match.song} → ${match.file.name}`);
			continue;
		}

		if (match.candidates.length > 0) {
			console.log(`  ? ${match.song} → multiple matches (${match.candidates.join(', ')})`);
			continue;
		}

		console.log(`  ? ${match.song} → not found (you will be prompted)`);
	}

	const unresolved = matches.filter(match => !match.file);
	if (unresolved.length > 0) {
		matches = await resolveUnresolvedMatches(matches, lyricsFiles);
	}

	console.log(`\nBuilding gig lyrics doc "${selectedSetlist.name}"...`);

	const existingGigDoc = await findGoogleDocInFolderByName(
		drive,
		folders.gigs.id,
		selectedSetlist.name,
	);
	let overwriteExisting = false;

	if (existingGigDoc) {
		overwriteExisting = await promptOverwrite(selectedSetlist.name);
		if (!overwriteExisting) {
			throw new Error('Cancelled. Existing gig lyrics doc was not changed.');
		}
	}

	const result = await buildGigLyricsDocument(
		drive,
		docs,
		folders.gigs.id,
		selectedSetlist.name,
		matches,
		{ overwriteExisting },
	);

	console.log('\nDone.');
	console.log(`${result.overwritten ? 'Updated' : 'Created'}: ${result.url}`);
}

main().catch(error => {
	if (error instanceof Error && error.message.includes('invalid_grant')) {
		console.error(
			'\nError: Google authorization expired. Delete scripts/.google-token.json and run again.',
		);
	} else {
		console.error('\nError:', error instanceof Error ? error.message : error);
	}
	process.exitCode = 1;
});
