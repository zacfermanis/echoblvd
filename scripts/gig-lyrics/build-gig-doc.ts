import type { docs_v1, drive_v3 } from 'googleapis';
import {
	buildCopyDocumentRequests,
	buildSongSeparatorRequests,
} from './copy-document-content';
import { applyDocumentRequests } from './docs-api';
import type { SongMatchResult } from './match-songs';
import {
	clearGoogleDoc,
	createGoogleDocInFolder,
	exportGoogleDocPlainText,
	findGoogleDocInFolderByName,
} from './drive';

export async function readSetlistSongs(
	drive: drive_v3.Drive,
	setlistFileId: string,
): Promise<string> {
	return exportGoogleDocPlainText(drive, setlistFileId);
}

export async function buildGigLyricsDocument(
	drive: drive_v3.Drive,
	docs: docs_v1.Docs,
	gigsFolderId: string,
	setlistName: string,
	matches: SongMatchResult[],
	options: { overwriteExisting?: boolean } = {},
): Promise<{ documentId: string; url: string; overwritten: boolean }> {
	const missingSongs = matches
		.filter(match => !match.file)
		.map(match => match.song);

	if (missingSongs.length > 0) {
		throw new Error(
			`Missing lyrics for: ${missingSongs.join(', ')}. Add matching docs in EchoBlvd > Lyrics first.`,
		);
	}

	const existing = await findGoogleDocInFolderByName(drive, gigsFolderId, setlistName);
	let documentId: string;
	let overwritten = false;

	if (existing) {
		if (!options.overwriteExisting) {
			throw new Error(
				`A gig lyrics doc named "${setlistName}" already exists in Lyrics > Gigs.`,
			);
		}

		documentId = existing.id;
		overwritten = true;
		await clearGoogleDoc(docs, documentId);
	} else {
		const created = await createGoogleDocInFolder(drive, gigsFolderId, setlistName);
		documentId = created.id;
	}

	const resolvedMatches = matches.filter(
		(match): match is SongMatchResult & { file: NonNullable<SongMatchResult['file']> } =>
			Boolean(match.file),
	);

	console.log(`Loading ${resolvedMatches.length} lyrics documents...`);
	const sourceDocuments = await Promise.all(
		resolvedMatches.map(async match => {
			const response = await docs.documents.get({ documentId: match.file.id });
			return response.data;
		}),
	);

	const allRequests: docs_v1.Schema$Request[] = [];
	let index = 1;

	for (let matchIndex = 0; matchIndex < resolvedMatches.length; matchIndex++) {
		if (matchIndex > 0) {
			const separator = buildSongSeparatorRequests(index);
			allRequests.push(...separator.requests);
			index = separator.endIndex;
		}

		const { requests, endIndex } = buildCopyDocumentRequests(
			sourceDocuments[matchIndex],
			index,
		);
		allRequests.push(...requests);
		index = endIndex;
	}

	console.log(
		`Applying ${allRequests.length} formatting operations (throttled for Google API limits)...`,
	);
	await applyDocumentRequests(docs, documentId, allRequests);

	return {
		documentId,
		url: `https://docs.google.com/document/d/${documentId}/edit`,
		overwritten,
	};
}
