import { NextResponse } from 'next/server';
import { authorizeKeepAliveRequest } from '@/app/lib/keep-alive';
import { getSupabaseServerClient } from '@/app/lib/supabase';

export const runtime = 'nodejs';

export async function GET(request: Request) {
	const auth = authorizeKeepAliveRequest(request);
	if (!auth.isAuthorized) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: auth.failureStatus ?? 401 });
	}

	try {
		const supabase = getSupabaseServerClient();
		const { data, error } = await supabase.from('shows').select('id').limit(1);
		if (error) throw error;

		return NextResponse.json({
			ok: true,
			hasData: (data ?? []).length > 0,
			timestamp: new Date().toISOString(),
		});
	} catch {
		return NextResponse.json({ error: 'Keep-alive query failed' }, { status: 500 });
	}
}

