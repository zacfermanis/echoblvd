import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isAuthenticatedFromCookies } from '@/app/lib/admin-auth';
import { getSupabaseServiceClient } from '@/app/lib/supabase';
import type { PracticeSong, PracticeSongTrack } from '@/app/types/band';
import { PracticeManager } from './practice-manager';

export const metadata: Metadata = {
	title: 'Practice - Admin - Echo Blvd',
	description: 'Multi-track stem player for band practice',
};

type SongRow = { id: string; title: string; artist: string; created_at: string; disabled_tracks: string[] };
type TrackRow = { id: string; song_id: string; track_key: string; storage_path: string; version: string };

export default async function PracticePage() {
	const isAuthed = await isAuthenticatedFromCookies();
	if (!isAuthed) redirect('/admin');

	const supabase = getSupabaseServiceClient();

	const { data: songs } = await supabase
		.from('practice_songs')
		.select('id, title, artist, created_at, disabled_tracks')
		.order('title', { ascending: true });

	const { data: tracks } = await supabase
		.from('practice_song_tracks')
		.select('id, song_id, track_key, storage_path, version');

	const tracksBySong = new Map<string, TrackRow[]>();
	for (const track of tracks ?? []) {
		const t = track as TrackRow;
		const list = tracksBySong.get(t.song_id) ?? [];
		list.push(t);
		tracksBySong.set(t.song_id, list);
	}

	const initialSongs: PracticeSong[] = (songs ?? []).map((row) => {
		const r = row as SongRow;
		return {
			id: r.id,
			title: r.title,
			artist: r.artist,
			createdAt: r.created_at,
			disabledTracks: r.disabled_tracks ?? [],
			tracks: (tracksBySong.get(r.id) ?? []).map(
				(t): PracticeSongTrack => ({
					id: t.id,
					songId: t.song_id,
					trackKey: t.track_key,
					storagePath: t.storage_path,
					version: t.version,
				}),
			),
		};
	});

	return (
		<div className="min-h-screen bg-gray-900">
			<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
				<div className="mb-8">
					<Link
						href="/admin"
						className="text-sm text-gray-400 hover:text-white transition-colors"
					>
						← Admin
					</Link>
				</div>
				<PracticeManager initialSongs={initialSongs} />
			</div>
		</div>
	);
}
