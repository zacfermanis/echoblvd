import { NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { assertAuthenticated } from '@/app/lib/admin-auth';
import { getR2Client, getR2BucketName } from '@/app/lib/r2';
import { PRACTICE_TRACK_DEFS } from '@/app/types/band';
import type { PracticeTrackKey } from '@/app/types/band';

export const runtime = 'nodejs';

const VALID_TRACK_KEYS = new Set<string>(PRACTICE_TRACK_DEFS.map((t) => t.key));
const UPLOAD_URL_EXPIRY_SECONDS = 3600;

export async function POST(request: Request) {
	try {
		await assertAuthenticated();
		const body = (await request.json()) as {
			songId: string;
			trackKey: string;
			fileExtension: string;
			takeId?: string | null;
		};

		const { songId, trackKey, fileExtension, takeId } = body;

		if (!songId || !trackKey || !fileExtension) {
			return NextResponse.json(
				{ error: 'songId, trackKey, and fileExtension are required' },
				{ status: 400 },
			);
		}

		if (!VALID_TRACK_KEYS.has(trackKey)) {
			return NextResponse.json({ error: 'Invalid track key' }, { status: 400 });
		}

		const ext = fileExtension.toLowerCase().replace(/^\./, '');
		const storagePath =
			takeId != null && takeId !== ''
				? `songs/${songId}/takes/${takeId}/${trackKey as PracticeTrackKey}.${ext}`
				: `songs/${songId}/${trackKey as PracticeTrackKey}.${ext}`;

		// ContentType is intentionally excluded from the presigned command.
		// Including it locks the signature to a specific MIME string — if the
		// browser's file.type differs by even a sub-type (e.g. audio/x-wav vs
		// audio/wav), R2 returns a 403. Without it, R2 accepts any Content-Type
		// and the presigned URL alone provides the authorization.
		const signedUrl = await getSignedUrl(
			getR2Client(),
			new PutObjectCommand({ Bucket: getR2BucketName(), Key: storagePath }),
			{ expiresIn: UPLOAD_URL_EXPIRY_SECONDS },
		);

		return NextResponse.json({ signedUrl, storagePath });
	} catch (error: unknown) {
		const status = (error as { status?: number }).status ?? 500;
		return NextResponse.json({ error: 'Failed to create upload URL' }, { status });
	}
}
