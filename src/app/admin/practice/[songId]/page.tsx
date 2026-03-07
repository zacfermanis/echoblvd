import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { isAuthenticatedFromCookies } from '@/app/lib/admin-auth';
import { getPracticeStreamUrls } from '@/app/lib/practice-stream-urls';
import { getSupabaseServiceClient } from '@/app/lib/supabase';
import type { PracticeSong, PracticeSongTrack } from '@/app/types/band';
import { PracticePlayerPage } from './practice-player-page';

type SongRow = { id: string; title: string; artist: string; created_at: string; disabled_tracks: string[] };
type TrackRow = { id: string; song_id: string; track_key: string; storage_path: string; version: string };

function mapSong(row: SongRow, tracks: TrackRow[]): PracticeSong {
	return {
		id: row.id,
		title: row.title,
		artist: row.artist,
		createdAt: row.created_at,
		disabledTracks: row.disabled_tracks ?? [],
		tracks: tracks.map(
			(t): PracticeSongTrack => ({
				id: t.id,
				songId: t.song_id,
				trackKey: t.track_key,
				storagePath: t.storage_path,
				version: t.version,
			}),
		),
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

	const { data: trackRows } = await supabase
		.from('practice_song_tracks')
		.select('id, song_id, track_key, storage_path, version')
		.eq('song_id', songId);

	const song = mapSong(songRow as SongRow, (trackRows ?? []) as TrackRow[]);
	const streamUrls = await getPracticeStreamUrls(songId);

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
				<PracticePlayerPage song={song} streamUrls={streamUrls} />
			</div>
		</div>
	);
}
