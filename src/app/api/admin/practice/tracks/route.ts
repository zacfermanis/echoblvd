import { NextResponse } from 'next/server';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { assertAuthenticated } from '@/app/lib/admin-auth';
import { getSupabaseServiceClient } from '@/app/lib/supabase';
import { getR2Client, getR2BucketName } from '@/app/lib/r2';
import type { PracticeSongTrack } from '@/app/types/band';

export const runtime = 'nodejs';

type TrackRow = {
	id: string;
	song_id: string;
	track_key: string;
	storage_path: string;
	version: string;
	take_id?: string | null;
};

function mapTrack(row: TrackRow): PracticeSongTrack {
	return {
		id: row.id,
		songId: row.song_id,
		trackKey: row.track_key,
		storagePath: row.storage_path,
		version: row.version,
		takeId: row.take_id ?? undefined,
	};
}

/** Create or replace a track record (upsert by song_id + track_key). */
export async function POST(request: Request) {
	try {
		await assertAuthenticated();
		const body = (await request.json()) as {
			songId: string;
			trackKey: string;
			storagePath: string;
			takeId?: string | null;
		};

		const { songId, trackKey, storagePath, takeId } = body;
		if (!songId || !trackKey || !storagePath) {
			return NextResponse.json(
				{ error: 'songId, trackKey, and storagePath are required' },
				{ status: 400 },
			);
		}

		const supabase = getSupabaseServiceClient();
		const takeIdVal = takeId != null && takeId !== '' ? takeId : null;
		const version = crypto.randomUUID();

		let query = supabase
			.from('practice_song_tracks')
			.select('id, song_id, track_key, storage_path, version, take_id')
			.eq('song_id', songId)
			.eq('track_key', trackKey);
		if (takeIdVal === null) {
			query = query.is('take_id', null);
		} else {
			query = query.eq('take_id', takeIdVal);
		}
		const { data: existing } = await query.maybeSingle();

		if (existing) {
			const { data: updated, error: updateError } = await supabase
				.from('practice_song_tracks')
				.update({ storage_path: storagePath, version })
				.eq('id', (existing as TrackRow).id)
				.select('id, song_id, track_key, storage_path, version, take_id')
				.single();
			if (updateError) throw updateError;
			return NextResponse.json(mapTrack(updated as TrackRow), { status: 201 });
		}

		const { data: inserted, error: insertError } = await supabase
			.from('practice_song_tracks')
			.insert({
				song_id: songId,
				track_key: trackKey,
				storage_path: storagePath,
				version,
				take_id: takeIdVal,
			})
			.select('id, song_id, track_key, storage_path, version, take_id')
			.single();
		if (insertError) throw insertError;
		return NextResponse.json(mapTrack(inserted as TrackRow), { status: 201 });
	} catch (error: unknown) {
		const status = (error as { status?: number }).status ?? 500;
		return NextResponse.json({ error: 'Failed to save track' }, { status });
	}
}

/** Delete a track record and its R2 object. */
export async function DELETE(request: Request) {
	try {
		await assertAuthenticated();
		const { searchParams } = new URL(request.url);
		const id = searchParams.get('id');
		if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

		const supabase = getSupabaseServiceClient();

		// Fetch storage path before deleting the row
		const { data: track } = await supabase
			.from('practice_song_tracks')
			.select('storage_path')
			.eq('id', id)
			.single();

		if (track) {
			await getR2Client().send(
				new DeleteObjectCommand({
					Bucket: getR2BucketName(),
					Key: (track as { storage_path: string }).storage_path,
				}),
			);
		}

		const { error } = await supabase.from('practice_song_tracks').delete().eq('id', id);
		if (error) throw error;

		return NextResponse.json({ ok: true });
	} catch (error: unknown) {
		const status = (error as { status?: number }).status ?? 500;
		return NextResponse.json({ error: 'Failed to delete track' }, { status });
	}
}
