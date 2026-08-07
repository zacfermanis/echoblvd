import { buildGigLyricsInsertRequests } from '../scripts/gig-lyrics/build-requests';
import {
	buildCopyDocumentRequests,
	buildSongSeparatorRequests,
} from '../scripts/gig-lyrics/copy-document-content';
import {
	matchSetlistToLyrics,
	matchSongToLyricsFile,
} from '../scripts/gig-lyrics/match-songs';
import { normalizeSongName, parseSetlistLines } from '../scripts/gig-lyrics/parse-setlist';

describe('parseSetlistLines', () => {
	it('parses one song title per line in order', () => {
		const raw = [
			'Set List',
			'',
			'1. 1979',
			'2. Interstate Love Song',
			'Shimmer',
		].join('\n');

		expect(parseSetlistLines(raw)).toEqual([
			'1979',
			'Interstate Love Song',
			'Shimmer',
		]);
	});

	it('skips divider lines and headers', () => {
		const raw = ['Gig: Arboretum', '-----', 'Times Like These'].join('\n');

		expect(parseSetlistLines(raw)).toEqual(['Times Like These']);
	});

	it('skips set headers between songs', () => {
		const raw = [
			'Arboretum - March 31',
			'Set 1',
			'All the Small Things',
			'1979',
			'Set 2',
			'Interstate Love Song',
			'Second Set',
		].join('\n');

		expect(parseSetlistLines(raw)).toEqual([
			'All the Small Things',
			'1979',
			'Interstate Love Song',
		]);
	});

	it('skips the first line as the show title for single-set gigs', () => {
		const raw = [
			'Arboretum - March 31',
			'All the Small Things',
			'1979',
			'Shimmer',
		].join('\n');

		expect(parseSetlistLines(raw)).toEqual([
			'All the Small Things',
			'1979',
			'Shimmer',
		]);
	});
});

describe('normalizeSongName', () => {
	it('normalizes spacing and casing', () => {
		expect(normalizeSongName('  Interstate   Love Song  ')).toBe(
			'interstate love song',
		);
	});

	it('ignores punctuation when comparing titles', () => {
		expect(normalizeSongName('Mr. Jones')).toBe(normalizeSongName('Mr Jones'));
	});
});

describe('matchSongToLyricsFile', () => {
	const lyricsFiles = [
		{ id: '1', name: '1979' },
		{ id: '2', name: 'Interstate Love Song' },
		{ id: '3', name: 'Shimmer' },
	];

	it('matches by exact doc title', () => {
		const match = matchSongToLyricsFile('1979', lyricsFiles);
		expect(match.file?.id).toBe('1');
	});

	it('matches artist-title setlist entries against title-only lyrics docs', () => {
		const match = matchSongToLyricsFile(
			'The Smashing Pumpkins - 1979',
			lyricsFiles,
		);
		expect(match.file?.id).toBe('1');
	});

	it('matches title-only setlist entries against song-artist lyrics docs', () => {
		const match = matchSongToLyricsFile('All the small things', [
			{ id: '4', name: 'All the small things - Blink 182' },
		]);

		expect(match.file?.id).toBe('4');
	});

	it('matches titles when lyrics filenames include punctuation', () => {
		const match = matchSongToLyricsFile('Mr Jones', [
			{ id: '5', name: 'Mr. Jones - Counting Crows' },
		]);

		expect(match.file?.id).toBe('5');
	});

	it('reports ambiguous matches when multiple lyrics docs share the same title', () => {
		const match = matchSongToLyricsFile('1979', [
			{ id: '1', name: '1979' },
			{ id: '2', name: '1979' },
		]);

		expect(match.file).toBeNull();
		expect(match.candidates).toEqual(['1979', '1979']);
	});
});

describe('matchSetlistToLyrics', () => {
	it('returns ordered matches for a full setlist', () => {
		const songs = ['1979', 'Shimmer'];
		const lyricsFiles = [
			{ id: '1', name: '1979' },
			{ id: '2', name: 'Shimmer' },
		];

		const matches = matchSetlistToLyrics(songs, lyricsFiles);
		expect(matches.map(match => match.file?.id)).toEqual(['1', '2']);
	});
});

describe('buildCopyDocumentRequests', () => {
	it('preserves text styles and paragraph indentation', () => {
		const { requests } = buildCopyDocumentRequests(
			{
				body: {
					content: [
						{
							paragraph: {
								elements: [
									{
										textRun: {
											content: 'Song Title\n',
											textStyle: {
												bold: true,
												fontSize: { magnitude: 18, unit: 'PT' },
											},
										},
									},
								],
								paragraphStyle: {
									namedStyleType: 'HEADING_1',
								},
							},
						},
						{
							paragraph: {
								elements: [
									{
										textRun: {
											content: 'Use delay pedal\n',
											textStyle: {
												italic: true,
												fontSize: { magnitude: 11, unit: 'PT' },
											},
										},
									},
								],
							},
						},
						{
							paragraph: {
								elements: [{ horizontalRule: {} }],
							},
						},
						{
							paragraph: {
								elements: [
									{
										textRun: {
											content: 'Chorus line\n',
										},
									},
								],
								paragraphStyle: {
									indentStart: { magnitude: 36, unit: 'PT' },
									indentFirstLine: { magnitude: 36, unit: 'PT' },
								},
							},
						},
					],
				},
			},
			1,
		);

		expect(requests.some(request => request.updateTextStyle?.textStyle?.bold)).toBe(true);
		expect(requests.some(request => request.updateTextStyle?.textStyle?.italic)).toBe(
			true,
		);
		expect(
			requests.some(
				request => request.updateParagraphStyle?.paragraphStyle?.indentStart,
			),
		).toBe(true);
		expect(requests.some(request => request.updateParagraphStyle?.fields === 'borderBottom')).toBe(
			true,
		);
	});
});

describe('buildSongSeparatorRequests', () => {
	it('inserts a divider and page break between songs', () => {
		const { requests } = buildSongSeparatorRequests(42);

		expect(requests).toHaveLength(3);
		expect(requests[0]).toMatchObject({
			insertText: { location: { index: 42 }, text: '\n' },
		});
		expect(requests[1]).toMatchObject({
			updateParagraphStyle: { fields: 'borderBottom' },
		});
		expect(requests[2]).toMatchObject({
			insertPageBreak: { location: { index: 43 } },
		});
	});
});

describe('buildGigLyricsInsertRequests', () => {
	it('inserts plain sections with a divider and page break between songs', () => {
		const requests = buildGigLyricsInsertRequests(['First song', 'Second song']);

		expect(requests).toHaveLength(5);
		expect(requests[0]).toMatchObject({
			insertText: { location: { index: 1 }, text: 'First song\n' },
		});
		expect(requests[3]).toMatchObject({ insertPageBreak: {} });
	});
});
