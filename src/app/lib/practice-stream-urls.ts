import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getR2Client, getR2BucketName } from '@/app/lib/r2';
import { getSupabaseServiceClient } from '@/app/lib/supabase';

const STREAM_URL_EXPIRY_SECONDS = 7200; // 2 hours per practice session

const MIME: Record<string, string> = {
	mp3: 'audio/mpeg',
	aac: 'audio/aac',
	m4a: 'audio/mp4',
	wav: 'audio/wav',
	ogg: 'audio/ogg',
	flac: 'audio/flac',
};

/** Returns presigned streaming URLs for all uploaded tracks of a song. Caller must ensure auth. */
export async function getPracticeStreamUrls(songId: string): Promise<Record<string, string>> {
	const supabase = getSupabaseServiceClient();
	const { data: tracks, error } = await supabase
		.from('practice_song_tracks')
		.select('track_key, storage_path')
		.eq('song_id', songId);

	if (error) throw error;

	const r2 = getR2Client();
	const bucket = getR2BucketName();
	const urls: Record<string, string> = {};

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

	return urls;
}
