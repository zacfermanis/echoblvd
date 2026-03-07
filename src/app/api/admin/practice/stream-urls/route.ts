import { NextResponse } from 'next/server';
import { assertAuthenticated } from '@/app/lib/admin-auth';
import { getPracticeStreamUrls } from '@/app/lib/practice-stream-urls';

export const runtime = 'nodejs';

/** Returns presigned streaming URLs for all uploaded tracks of a song. */
export async function GET(request: Request) {
	try {
		await assertAuthenticated();
		const { searchParams } = new URL(request.url);
		const songId = searchParams.get('songId');
		if (!songId) return NextResponse.json({ error: 'songId is required' }, { status: 400 });

		const urls = await getPracticeStreamUrls(songId);
		return NextResponse.json({ urls });
	} catch (error: unknown) {
		const status = (error as { status?: number }).status ?? 500;
		return NextResponse.json({ error: 'Failed to generate stream URLs' }, { status });
	}
}
