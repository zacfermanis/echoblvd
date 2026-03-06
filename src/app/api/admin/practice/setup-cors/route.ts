import { NextResponse } from 'next/server';
import { PutBucketCorsCommand } from '@aws-sdk/client-s3';
import { assertAuthenticated } from '@/app/lib/admin-auth';
import { getR2Client, getR2BucketName } from '@/app/lib/r2';

export const runtime = 'nodejs';

/**
 * POST /api/admin/practice/setup-cors
 *
 * One-time setup: writes a CORS policy to the R2 bucket so browsers
 * can PUT files directly via presigned upload URLs.
 * Call this once after creating the bucket and adding env vars.
 */
export async function POST() {
	try {
		await assertAuthenticated();

		await getR2Client().send(
			new PutBucketCorsCommand({
				Bucket: getR2BucketName(),
				CORSConfiguration: {
					CORSRules: [
						{
							// Allow browsers on any origin to PUT (upload) and GET (stream)
							// Security is enforced by the presigned URL itself, not by origin.
							AllowedOrigins: ['*'],
							AllowedMethods: ['PUT', 'GET', 'HEAD'],
							AllowedHeaders: ['Content-Type', 'Content-Length'],
							ExposeHeaders: ['ETag'],
							MaxAgeSeconds: 3600,
						},
					],
				},
			}),
		);

		return NextResponse.json({ ok: true, message: 'CORS policy applied to R2 bucket' });
	} catch (error: unknown) {
		const msg = error instanceof Error ? error.message : 'Unknown error';
		return NextResponse.json({ error: `Failed to set CORS: ${msg}` }, { status: 500 });
	}
}
