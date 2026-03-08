import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { isAuthenticatedFromCookies } from '@/app/lib/admin-auth';
import { getPracticeStreamUrls } from '@/app/lib/practice-stream-urls';
import { getSupabaseServiceClient } from '@/app/lib/supabase';
import type { PracticeSong, PracticeSongTrack, PracticeTake } from '@/app/types/band';
import { PracticePlayerPage } from './practice-player-page';

type SongRow = { id: string; title: string; artist: string; created_at: string; disabled_tracks: string[] };
type TrackRow = { id: string; song_id: string; track_key: string; storage_path: string; version: string; take_id?: string | null };
type TakeRow = { id: string; song_id: string; name: string; created_at: string };

function mapTrack(t: TrackRow): PracticeSongTrack {
	return {
		id: t.id,
		songId: t.song_id,
		trackKey: t.track_key,
		storagePath: t.storage_path,
		version: t.version,
		takeId: t.take_id ?? undefined,
	};
}

function mapSong(
	row: SongRow,
	originalTracks: TrackRow[],
	takesWithTracks: { take: TakeRow; tracks: TrackRow[] }[],
): PracticeSong {
	return {
		id: row.id,
		title: row.title,
		artist: row.artist,
		createdAt: row.created_at,
		disabledTracks: row.disabled_tracks ?? [],
		tracks: originalTracks.map(mapTrack),
		takes: takesWithTracks.length > 0
			? (takesWithTracks.map(
					({ take, tracks }) =>
						({
							id: take.id,
							songId: take.song_id,
							name: take.name,
							createdAt: take.created_at,
							tracks: tracks.map(mapTrack),
						}) satisfies PracticeTake,
				) as PracticeTake[])
			: undefined,
	};
}

interface Props {
	params: Promise<{ songId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { songId } = await params;
	const isAuthed = await isAuthenticatedFromCookies();
	if (!isAuthed) return { title: 'Practice - Admin - Echo Blvd' };

	const supabase = getSupabaseServiceClient();
	const { data: row } = await supabase
		.from('practice_songs')
		.select('title, artist')
		.eq('id', songId)
		.single();

	const r = row as { title: string; artist: string } | null;
	const title = r ? `${r.title} – Practice` : 'Practice';
	return {
		title: `${title} - Admin - Echo Blvd`,
		description: r ? `Multi-track practice player for ${r.title} by ${r.artist}` : 'Multi-track stem player for band practice',
	};
}

export default async function PracticeSongPage({ params }: Props) {
	const isAuthed = await isAuthenticatedFromCookies();
	if (!isAuthed) redirect('/admin');

	const { songId } = await params;
	const supabase = getSupabaseServiceClient();

	const { data: songRow, error: songError } = await supabase
		.from('practice_songs')
		.select('id, title, artist, created_at, disabled_tracks')
		.eq('id', songId)
		.single();

	if (songError || !songRow) notFound();

	const { data: allTrackRows } = await supabase
		.from('practice_song_tracks')
		.select('id, song_id, track_key, storage_path, version, take_id')
		.eq('song_id', songId);

	const trackList = (allTrackRows ?? []) as TrackRow[];
	const originalTracks = trackList.filter((t) => t.take_id == null || t.take_id === '');

	let takesWithTracks: { take: TakeRow; tracks: TrackRow[] }[] = [];
	try {
		const { data: takeRows } = await supabase
			.from('practice_song_takes')
			.select('id, song_id, name, created_at')
			.eq('song_id', songId)
			.order('created_at', { ascending: true });
		const takesList = (takeRows ?? []) as TakeRow[];
		takesWithTracks = takesList.map((take) => ({
			take,
			tracks: trackList.filter((t) => t.take_id === take.id),
		}));
	} catch {
		// practice_song_takes may not exist before migration
	}

	const song = mapSong(songRow as SongRow, originalTracks, takesWithTracks);
	const streamUrls = await getPracticeStreamUrls(songId, null);

	return (
		<div className="min-h-screen bg-gray-900">
			<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
				<div className="mb-8">
					<Link
						href="/admin/practice"
						className="text-sm text-gray-400 hover:text-white transition-colors"
					>
						← Practice
					</Link>
				</div>
				<PracticePlayerPage song={song} initialStreamUrls={streamUrls} />
			</div>
		</div>
	);
}
