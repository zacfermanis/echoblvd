import { NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { assertAuthenticated } from '@/app/lib/admin-auth';
import { getR2Client, getR2BucketName } from '@/app/lib/r2';
import { getSupabaseServiceClient } from '@/app/lib/supabase';

export const runtime = 'nodejs';

const STREAM_URL_EXPIRY_SECONDS = 7200; // 2 hours per practice session

/** Returns presigned streaming URLs for all uploaded tracks of a song. */
export async function GET(request: Request) {
	try {
		await assertAuthenticated();
		const { searchParams } = new URL(request.url);
		const songId = searchParams.get('songId');
		if (!songId) return NextResponse.json({ error: 'songId is required' }, { status: 400 });

		const supabase = getSupabaseServiceClient();
		const { data: tracks, error } = await supabase
			.from('practice_song_tracks')
			.select('track_key, storage_path')
			.eq('song_id', songId);

		if (error) throw error;

		const r2 = getR2Client();
		const bucket = getR2BucketName();
		const urls: Record<string, string> = {};

		// Map file extensions → MIME types so R2 returns the right Content-Type
		// in the streaming response. Without this, objects uploaded without an
		// explicit ContentType come back as application/octet-stream and the
		// browser's <audio> element throws "NotSupportedError: no supported sources".
		const MIME: Record<string, string> = {
			mp3: 'audio/mpeg',
			aac: 'audio/aac',
			m4a: 'audio/mp4',
			wav: 'audio/wav',
			ogg: 'audio/ogg',
			flac: 'audio/flac',
		};

		await Promise.all(
			(tracks ?? []).map(async (track) => {
				const t = track as { track_key: string; storage_path: string };
				const ext = t.storage_path.split('.').pop()?.toLowerCase() ?? 'mp3';
				const signedUrl = await getSignedUrl(
					r2,
					new GetObjectCommand({
						Bucket: bucket,
						Key: t.storage_path,
						ResponseContentType: MIME[ext] ?? 'audio/mpeg',
					}),
					{ expiresIn: STREAM_URL_EXPIRY_SECONDS },
				);
				urls[t.track_key] = signedUrl;
			}),
		);

		return NextResponse.json({ urls });
	} catch (error: unknown) {
		const status = (error as { status?: number }).status ?? 500;
		return NextResponse.json({ error: 'Failed to generate stream URLs' }, { status });
	}
}
