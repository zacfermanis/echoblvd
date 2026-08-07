import type { docs_v1, drive_v3 } from 'googleapis';

export interface DriveFile {
	id: string;
	name: string;
	mimeType?: string | null;
}

const FOLDER_MIME = 'application/vnd.google-apps.folder';
const GOOGLE_DOC_MIME = 'application/vnd.google-apps.document';

export async function findChildFolderByName(
	drive: drive_v3.Drive,
	parentId: string,
	folderName: string,
): Promise<DriveFile | null> {
	const response = await drive.files.list({
		q: [
			`'${parentId}' in parents`,
			`name = '${folderName.replace(/'/g, "\\'")}'`,
			`mimeType = '${FOLDER_MIME}'`,
			'trashed = false',
		].join(' and '),
		fields: 'files(id, name, mimeType)',
		pageSize: 10,
	});

	const files = response.data.files ?? [];
	const match = files.find(file => file.id && file.name);
	return match ? { id: match.id!, name: match.name!, mimeType: match.mimeType } : null;
}

export async function findFolderByName(
	drive: drive_v3.Drive,
	folderName: string,
): Promise<DriveFile | null> {
	const response = await drive.files.list({
		q: [
			`name = '${folderName.replace(/'/g, "\\'")}'`,
			`mimeType = '${FOLDER_MIME}'`,
			'trashed = false',
		].join(' and '),
		fields: 'files(id, name, mimeType)',
		pageSize: 20,
	});

	const files = (response.data.files ?? []).filter(
		(file): file is DriveFile => Boolean(file.id && file.name),
	);
	if (files.length === 1) {
		return { id: files[0].id, name: files[0].name, mimeType: files[0].mimeType };
	}
	if (files.length > 1) {
		console.warn(
			`Multiple "${folderName}" folders found. Using the first match (${files[0].name}).`,
		);
		return { id: files[0].id, name: files[0].name, mimeType: files[0].mimeType };
	}

	return null;
}

function getEnvFolderId(name: string): string | undefined {
	const value = process.env[name]?.trim();
	return value || undefined;
}

export async function resolveEchoBlvdFolders(drive: drive_v3.Drive) {
	const rootFolderName = process.env.GOOGLE_DRIVE_ROOT_FOLDER_NAME?.trim() || 'Echo Blvd';
	const rootFolderId = getEnvFolderId('GOOGLE_DRIVE_ECHOBLVD_FOLDER_ID');
	const setListsId = getEnvFolderId('GOOGLE_DRIVE_SETLISTS_FOLDER_ID');
	const lyricsId = getEnvFolderId('GOOGLE_DRIVE_LYRICS_FOLDER_ID');
	const gigsId = getEnvFolderId('GOOGLE_DRIVE_GIGS_FOLDER_ID');

	const echoBlvd = rootFolderId
		? { id: rootFolderId, name: rootFolderName }
		: await findFolderByName(drive, rootFolderName);

	if (!echoBlvd) {
		throw new Error(
			`Could not find a "${rootFolderName}" folder in Google Drive. Set GOOGLE_DRIVE_ECHOBLVD_FOLDER_ID in .env.local to override.`,
		);
	}

	const setLists = setListsId
		? { id: setListsId, name: 'SetLists' }
		: await findChildFolderByName(drive, echoBlvd.id, 'SetLists');

	if (!setLists) {
		throw new Error(
			`Could not find "${rootFolderName} > SetLists". Set GOOGLE_DRIVE_SETLISTS_FOLDER_ID in .env.local to override.`,
		);
	}

	const lyrics = lyricsId
		? { id: lyricsId, name: 'Lyrics' }
		: await findChildFolderByName(drive, echoBlvd.id, 'Lyrics');

	if (!lyrics) {
		throw new Error(
			`Could not find "${rootFolderName} > Lyrics". Set GOOGLE_DRIVE_LYRICS_FOLDER_ID in .env.local to override.`,
		);
	}

	const gigs = gigsId
		? { id: gigsId, name: 'Gigs' }
		: await findChildFolderByName(drive, lyrics.id, 'Gigs');

	if (!gigs) {
		throw new Error(
			`Could not find "${rootFolderName} > Lyrics > Gigs". Set GOOGLE_DRIVE_GIGS_FOLDER_ID in .env.local to override.`,
		);
	}

	return { echoBlvd, setLists, lyrics, gigs };
}

export async function listGoogleDocsInFolder(
	drive: drive_v3.Drive,
	folderId: string,
): Promise<DriveFile[]> {
	const files: DriveFile[] = [];
	let pageToken: string | undefined;

	do {
		const response = await drive.files.list({
			q: [
				`'${folderId}' in parents`,
				`mimeType = '${GOOGLE_DOC_MIME}'`,
				'trashed = false',
			].join(' and '),
			fields: 'nextPageToken, files(id, name, mimeType)',
			orderBy: 'name',
			pageSize: 100,
			pageToken,
		});

		files.push(
			...(response.data.files ?? [])
				.filter((file): file is DriveFile => Boolean(file.id && file.name))
				.map(file => ({
					id: file.id,
					name: file.name,
					mimeType: file.mimeType,
				})),
		);
		pageToken = response.data.nextPageToken ?? undefined;
	} while (pageToken);

	return files;
}

export async function exportGoogleDocPlainText(
	drive: drive_v3.Drive,
	fileId: string,
): Promise<string> {
	const response = await drive.files.export(
		{ fileId, mimeType: 'text/plain' },
		{ responseType: 'text' },
	);

	return typeof response.data === 'string' ? response.data : String(response.data ?? '');
}

export async function createGoogleDocInFolder(
	drive: drive_v3.Drive,
	folderId: string,
	name: string,
): Promise<DriveFile> {
	const response = await drive.files.create({
		requestBody: {
			name,
			mimeType: GOOGLE_DOC_MIME,
			parents: [folderId],
		},
		fields: 'id, name, mimeType',
	});

	if (!response.data.id || !response.data.name) {
		throw new Error(`Failed to create Google Doc "${name}".`);
	}

	return {
		id: response.data.id,
		name: response.data.name,
		mimeType: response.data.mimeType,
	};
}

export async function findGoogleDocInFolderByName(
	drive: drive_v3.Drive,
	folderId: string,
	name: string,
): Promise<DriveFile | null> {
	const response = await drive.files.list({
		q: [
			`'${folderId}' in parents`,
			`name = '${name.replace(/'/g, "\\'")}'`,
			`mimeType = '${GOOGLE_DOC_MIME}'`,
			'trashed = false',
		].join(' and '),
		fields: 'files(id, name, mimeType)',
		pageSize: 1,
	});

	const match = response.data.files?.find(file => file.id && file.name);
	return match
		? { id: match.id!, name: match.name!, mimeType: match.mimeType }
		: null;
}

export async function clearGoogleDoc(
	docs: docs_v1.Docs,
	documentId: string,
): Promise<void> {
	const response = await docs.documents.get({ documentId });
	const content = response.data.body?.content ?? [];
	const endIndex = (content.at(-1)?.endIndex ?? 1) - 1;

	if (endIndex <= 1) return;

	await docs.documents.batchUpdate({
		documentId,
		requestBody: {
			requests: [
				{
					deleteContentRange: {
						range: {
							startIndex: 1,
							endIndex,
						},
					},
				},
			],
		},
	});
}
