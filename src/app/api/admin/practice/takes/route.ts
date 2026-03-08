import { NextResponse } from 'next/server';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { assertAuthenticated } from '@/app/lib/admin-auth';
import { getR2Client, getR2BucketName } from '@/app/lib/r2';
import { getSupabaseServiceClient } from '@/app/lib/supabase';
import type { PracticeTake } from '@/app/types/band';

export const runtime = 'nodejs';

type TakeRow = {
	id: string;
	song_id: string;
	name: string;
	created_at: string;
};

/** Create a new take for a song (e.g. "Rehearsal Mar 7"). */
export async function POST(request: Request) {
	try {
		await assertAuthenticated();
		const body = (await request.json()) as { songId: string; name?: string };
		const songId = body.songId;
		if (!songId) return NextResponse.json({ error: 'songId is required' }, { status: 400 });

		const supabase = getSupabaseServiceClient();

		// Ensure song exists
		const { data: song, error: songError } = await supabase
			.from('practice_songs')
			.select('id')
			.eq('id', songId)
			.single();
		if (songError || !song) {
			return NextResponse.json({ error: 'Song not found' }, { status: 404 });
		}

		const name = (body.name?.trim() || `Take ${new Date().toLocaleDateString()}`).slice(0, 200);
		const { data: row, error } = await supabase
			.from('practice_song_takes')
			.insert({ song_id: songId, name })
			.select('id, song_id, name, created_at')
			.single();

		if (error) throw error;

		const take: PracticeTake = {
			id: (row as TakeRow).id,
			songId: (row as TakeRow).song_id,
			name: (row as TakeRow).name,
			createdAt: (row as TakeRow).created_at,
			tracks: [],
		};
		return NextResponse.json(take, { status: 201 });
	} catch (error: unknown) {
		const status = (error as { status?: number }).status ?? 500;
		return NextResponse.json({ error: 'Failed to create take' }, { status });
	}
}

/** Rename a take. Body: { id, name } */
export async function PATCH(request: Request) {
	try {
		await assertAuthenticated();
		const body = (await request.json()) as { id?: string; name?: string };
		const { id, name } = body;
		if (!id || !name?.trim()) {
			return NextResponse.json({ error: 'id and name are required' }, { status: 400 });
		}

		const supabase = getSupabaseServiceClient();
		const { data: row, error } = await supabase
			.from('practice_song_takes')
			.update({ name: name.trim().slice(0, 200) })
			.eq('id', id)
			.select('id, song_id, name, created_at')
			.single();

		if (error) throw error;

		const take: PracticeTake = {
			id: (row as TakeRow).id,
			songId: (row as TakeRow).song_id,
			name: (row as TakeRow).name,
			createdAt: (row as TakeRow).created_at,
			tracks: [],
		};
		return NextResponse.json(take);
	} catch (error: unknown) {
		const status = (error as { status?: number }).status ?? 500;
		return NextResponse.json({ error: 'Failed to rename take' }, { status });
	}
}

/** Delete a take and all its tracks (and their R2 objects). */
export async function DELETE(request: Request) {
	try {
		await assertAuthenticated();
		const { searchParams } = new URL(request.url);
		const id = searchParams.get('id');
		if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

		const supabase = getSupabaseServiceClient();

		const { data: tracks } = await supabase
			.from('practice_song_tracks')
			.select('storage_path')
			.eq('take_id', id);

		if (tracks && tracks.length > 0) {
			const r2 = getR2Client();
			const bucket = getR2BucketName();
			await Promise.all(
				(tracks as { storage_path: string }[]).map((t) =>
					r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: t.storage_path })),
				),
			);
		}

		const { error } = await supabase.from('practice_song_takes').delete().eq('id', id);
		if (error) throw error;

		return NextResponse.json({ ok: true });
	} catch (error: unknown) {
		const status = (error as { status?: number }).status ?? 500;
		return NextResponse.json({ error: 'Failed to delete take' }, { status });
	}
}
