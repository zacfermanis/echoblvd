import { NextResponse } from 'next/server';
import { DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { assertAuthenticated } from '@/app/lib/admin-auth';
import { getSupabaseServiceClient } from '@/app/lib/supabase';
import { getR2Client, getR2BucketName } from '@/app/lib/r2';
import type { PracticeSong, PracticeSongTrack, PracticeTake } from '@/app/types/band';

export const runtime = 'nodejs';

type SongRow = {
	id: string;
	title: string;
	artist: string;
	created_at: string;
	disabled_tracks: string[];
};

type TrackRow = {
	id: string;
	song_id: string;
	track_key: string;
	storage_path: string;
	version: string;
	take_id?: string | null;
};

type TakeRow = {
	id: string;
	song_id: string;
	name: string;
	created_at: string;
};

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
			? takesWithTracks.map(
					({ take, tracks }) =>
						({
							id: take.id,
							songId: take.song_id,
							name: take.name,
							createdAt: take.created_at,
							tracks: tracks.map(mapTrack),
						}) satisfies PracticeTake,
				)
			: undefined,
	};
}

export async function GET() {
	try {
		await assertAuthenticated();
		const supabase = getSupabaseServiceClient();

		const { data: songs, error: songsError } = await supabase
			.from('practice_songs')
			.select('id, title, artist, created_at, disabled_tracks')
			.order('title', { ascending: true });
		if (songsError) throw songsError;

		let takes: TakeRow[] = [];
		try {
			const { data: takesData, error: takesError } = await supabase
				.from('practice_song_takes')
				.select('id, song_id, name, created_at')
				.order('created_at', { ascending: true });
			if (!takesError) takes = (takesData ?? []) as TakeRow[];
		} catch {
			// Table may not exist before migration
		}

		const { data: tracks, error: tracksError } = await supabase
			.from('practice_song_tracks')
			.select('id, song_id, track_key, storage_path, version, take_id');
		if (tracksError) throw tracksError;

		const allTracks = (tracks ?? []) as TrackRow[];
		const originalTracksBySong = new Map<string, TrackRow[]>();
		const takeTracksByTakeId = new Map<string, TrackRow[]>();
		for (const track of allTracks) {
			const t = track as TrackRow;
			if (t.take_id == null || t.take_id === '') {
				const list = originalTracksBySong.get(t.song_id) ?? [];
				list.push(t);
				originalTracksBySong.set(t.song_id, list);
			} else {
				const list = takeTracksByTakeId.get(t.take_id) ?? [];
				list.push(t);
				takeTracksByTakeId.set(t.take_id, list);
			}
		}

		const takesBySong = new Map<string, TakeRow[]>();
		for (const take of takes) {
			const row = take as TakeRow;
			const list = takesBySong.get(row.song_id) ?? [];
			list.push(row);
			takesBySong.set(row.song_id, list);
		}

		const result: PracticeSong[] = (songs ?? []).map((row) => {
			const songRow = row as SongRow;
			const originalTracks = originalTracksBySong.get(songRow.id) ?? [];
			const songTakes = takesBySong.get(songRow.id) ?? [];
			const takesWithTracks = songTakes.map((take) => ({
				take,
				tracks: takeTracksByTakeId.get(take.id) ?? [],
			}));
			return mapSong(songRow, originalTracks, takesWithTracks);
		});

		return NextResponse.json(result);
	} catch (error: unknown) {
		const status = (error as { status?: number }).status ?? 500;
		return NextResponse.json({ error: 'Failed to load songs' }, { status });
	}
}

export async function POST(request: Request) {
	try {
		await assertAuthenticated();
		const body = (await request.json()) as { title: string; artist: string };
		if (!body.title?.trim() || !body.artist?.trim()) {
			return NextResponse.json({ error: 'title and artist are required' }, { status: 400 });
		}

		const supabase = getSupabaseServiceClient();
	const { data, error } = await supabase
		.from('practice_songs')
		.insert({ title: body.title.trim(), artist: body.artist.trim() })
		.select('id, title, artist, created_at, disabled_tracks')
		.single();
		if (error) throw error;

		return NextResponse.json(mapSong(data as SongRow, [], []), { status: 201 });
	} catch (error: unknown) {
		const status = (error as { status?: number }).status ?? 500;
		return NextResponse.json({ error: 'Failed to create song' }, { status });
	}
}

export async function DELETE(request: Request) {
	try {
		await assertAuthenticated();
		const { searchParams } = new URL(request.url);
		const id = searchParams.get('id');
		if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

		const supabase = getSupabaseServiceClient();

		// Fetch track paths so we can delete the R2 objects
		const { data: tracks } = await supabase
			.from('practice_song_tracks')
			.select('storage_path')
			.eq('song_id', id);

		if (tracks && tracks.length > 0) {
			const objects = (tracks as { storage_path: string }[]).map((t) => ({ Key: t.storage_path }));
			await getR2Client().send(
				new DeleteObjectsCommand({
					Bucket: getR2BucketName(),
					Delete: { Objects: objects },
				}),
			);
		}

		// Cascade delete removes the track rows via FK
		const { error } = await supabase.from('practice_songs').delete().eq('id', id);
		if (error) throw error;

		return NextResponse.json({ ok: true });
	} catch (error: unknown) {
		const status = (error as { status?: number }).status ?? 500;
		return NextResponse.json({ error: 'Failed to delete song' }, { status });
	}
}

/** Update mutable song fields (currently: disabled_tracks). */
export async function PATCH(request: Request) {
	try {
		await assertAuthenticated();
		const { searchParams } = new URL(request.url);
		const id = searchParams.get('id');
		if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

		const body = (await request.json()) as { disabledTracks?: unknown };
		if (!Array.isArray(body.disabledTracks)) {
			return NextResponse.json({ error: 'disabledTracks must be an array' }, { status: 400 });
		}

		const supabase = getSupabaseServiceClient();
		const { error } = await supabase
			.from('practice_songs')
			.update({ disabled_tracks: body.disabledTracks as string[] })
			.eq('id', id);

		if (error) throw error;
		return NextResponse.json({ ok: true });
	} catch (error: unknown) {
		const status = (error as { status?: number }).status ?? 500;
		return NextResponse.json({ error: 'Failed to update song' }, { status });
	}
}
