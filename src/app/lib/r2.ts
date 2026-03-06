import { S3Client } from '@aws-sdk/client-s3';

function getR2AccountId(): string {
	const id = process.env.R2_ACCOUNT_ID;
	if (!id) throw new Error('R2_ACCOUNT_ID is not configured');
	return id;
}

function getR2AccessKeyId(): string {
	const key = process.env.R2_ACCESS_KEY_ID;
	if (!key) throw new Error('R2_ACCESS_KEY_ID is not configured');
	return key;
}

function getR2SecretAccessKey(): string {
	const secret = process.env.R2_SECRET_ACCESS_KEY;
	if (!secret) throw new Error('R2_SECRET_ACCESS_KEY is not configured');
	return secret;
}

export function getR2BucketName(): string {
	return process.env.R2_BUCKET_NAME ?? 'song-stems';
}

/** Returns a new S3Client pointed at Cloudflare R2. */
export function getR2Client(): S3Client {
	return new S3Client({
		region: 'auto',
		endpoint: `https://${getR2AccountId()}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId: getR2AccessKeyId(),
			secretAccessKey: getR2SecretAccessKey(),
		},
	});
}
