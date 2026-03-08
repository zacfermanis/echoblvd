import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isAuthenticatedFromCookies } from '@/app/lib/admin-auth';
import { getSupabaseServiceClient } from '@/app/lib/supabase';
import type { PracticeSong, PracticeSongTrack, PracticeTake } from '@/app/types/band';
import { PracticeManager } from './practice-manager';

export const metadata: Metadata = {
	title: 'Practice - Admin - Echo Blvd',
	description: 'Multi-track stem player for band practice',
};

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

export default async function PracticePage() {
	const isAuthed = await isAuthenticatedFromCookies();
	if (!isAuthed) redirect('/admin');

	const supabase = getSupabaseServiceClient();

	const { data: songs } = await supabase
		.from('practice_songs')
		.select('id, title, artist, created_at, disabled_tracks')
		.order('title', { ascending: true });

	let takes: TakeRow[] = [];
	try {
		const { data: takesData } = await supabase
			.from('practice_song_takes')
			.select('id, song_id, name, created_at')
			.order('created_at', { ascending: true });
		takes = (takesData ?? []) as TakeRow[];
	} catch {
		// Table may not exist before migration
	}

	let allTracks: TrackRow[] = [];
	try {
		const { data: tracks } = await supabase
			.from('practice_song_tracks')
			.select('id, song_id, track_key, storage_path, version, take_id');
		allTracks = (tracks ?? []) as TrackRow[];
	} catch {
		// take_id may not exist before migration; fetch without it and treat all as original
		const { data: tracks } = await supabase
			.from('practice_song_tracks')
			.select('id, song_id, track_key, storage_path, version');
		allTracks = ((tracks ?? []) as Omit<TrackRow, 'take_id'>[]).map((t) => ({ ...t, take_id: null }));
	}

	const originalTracksBySong = new Map<string, TrackRow[]>();
	const takeTracksByTakeId = new Map<string, TrackRow[]>();
	for (const track of allTracks) {
		if (track.take_id == null || track.take_id === '') {
			const list = originalTracksBySong.get(track.song_id) ?? [];
			list.push(track);
			originalTracksBySong.set(track.song_id, list);
		} else {
			const list = takeTracksByTakeId.get(track.take_id) ?? [];
			list.push(track);
			takeTracksByTakeId.set(track.take_id, list);
		}
	}

	const takesBySong = new Map<string, TakeRow[]>();
	for (const take of takes) {
		const list = takesBySong.get(take.song_id) ?? [];
		list.push(take);
		takesBySong.set(take.song_id, list);
	}

	const initialSongs: PracticeSong[] = (songs ?? []).map((row) => {
		const r = row as SongRow;
		const originalTracks = originalTracksBySong.get(r.id) ?? [];
		const songTakes = takesBySong.get(r.id) ?? [];
		const takesWithTracks = songTakes.map((take) => ({
			take,
			tracks: takeTracksByTakeId.get(take.id) ?? [],
		}));
		return {
			id: r.id,
			title: r.title,
			artist: r.artist,
			createdAt: r.created_at,
			disabledTracks: r.disabled_tracks ?? [],
			tracks: originalTracks.map(mapTrack),
			takes: takesWithTracks.length > 0
				? (takesWithTracks.map(
						({ take, tracks: takeTracks }) =>
							({
								id: take.id,
								songId: take.song_id,
								name: take.name,
								createdAt: take.created_at,
								tracks: takeTracks.map(mapTrack),
							}) satisfies PracticeTake,
					) as PracticeTake[])
				: undefined,
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
