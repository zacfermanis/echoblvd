import { NextResponse } from 'next/server';
import { generateSessionToken, getAdminPassword, requirePasswordProvided, setAuthCookie } from '@/app/lib/admin-auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
	try {
		const { password } = await request.json().catch(() => ({}));
		const provided = requirePasswordProvided(password);
		const adminPassword = getAdminPassword();
		if (!adminPassword) {
			return NextResponse.json({ error: 'Admin password not configured' }, { status: 500 });
		}
		if (provided !== adminPassword) {
			return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
		}
		const token = generateSessionToken(adminPassword);
		await setAuthCookie(token);
		return NextResponse.json({ ok: true });
	} catch (error: unknown) {
		const status = (error as { status?: number }).status ?? 500;
		const message = status === 400 ? 'Password required' : 'Internal server error';
		return NextResponse.json({ error: message }, { status });
	}
}


