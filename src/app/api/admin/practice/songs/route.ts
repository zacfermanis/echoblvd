import { NextResponse } from 'next/server';
import { DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { assertAuthenticated } from '@/app/lib/admin-auth';
import { getSupabaseServiceClient } from '@/app/lib/supabase';
import { getR2Client, getR2BucketName } from '@/app/lib/r2';
import type { PracticeSong, PracticeSongTrack } from '@/app/types/band';

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
};

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
			}),
		),
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

		const { data: tracks, error: tracksError } = await supabase
			.from('practice_song_tracks')
			.select('id, song_id, track_key, storage_path');
		if (tracksError) throw tracksError;

		const tracksBySong = new Map<string, TrackRow[]>();
		for (const track of tracks ?? []) {
			const t = track as TrackRow;
			const list = tracksBySong.get(t.song_id) ?? [];
			list.push(t);
			tracksBySong.set(t.song_id, list);
		}

		const result: PracticeSong[] = (songs ?? []).map((row) =>
			mapSong(row as SongRow, tracksBySong.get((row as SongRow).id) ?? []),
		);

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

		return NextResponse.json(mapSong(data as SongRow, []), { status: 201 });
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
