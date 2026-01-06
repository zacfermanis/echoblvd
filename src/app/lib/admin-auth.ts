import { cookies } from 'next/headers';
import crypto from 'crypto';

const COOKIE_NAME = 'admin_session';
const HMAC_MESSAGE = 'authenticated';

export function getAdminPassword(): string | undefined {
	const password = process.env.ADMIN_PASSWORD;
	return password && password.trim().length > 0 ? password : undefined;
}

export function generateSessionToken(password: string): string {
	return crypto.createHmac('sha256', password).update(HMAC_MESSAGE).digest('hex');
}

export async function setAuthCookie(token: string): Promise<void> {
	const cookieStore = await cookies();
	cookieStore.set(COOKIE_NAME, token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		path: '/',
		maxAge: 60 * 60 * 24 * 7, // 7 days
	});
}

export async function clearAuthCookie(): Promise<void> {
	const cookieStore = await cookies();
	cookieStore.set(COOKIE_NAME, '', {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		path: '/',
		maxAge: 0,
	});
}

export async function isAuthenticatedFromCookies(): Promise<boolean> {
	const password = getAdminPassword();
	if (!password) return false;

	const cookieStore = await cookies();
	const sessionCookie = cookieStore.get(COOKIE_NAME)?.value;
	if (!sessionCookie) return false;

	const expected = generateSessionToken(password);
	return crypto.timingSafeEqual(Buffer.from(sessionCookie), Buffer.from(expected));
}

export async function assertAuthenticated(): Promise<void> {
	if (!(await isAuthenticatedFromCookies())) {
		const error = new Error('Unauthorized');
		// @ts-expect-error attach status for handlers
		error.status = 401;
		throw error;
	}
}

export function requirePasswordProvided(passwordFromBody: unknown): string {
	if (typeof passwordFromBody !== 'string' || passwordFromBody.trim().length === 0) {
		const error = new Error('Password required');
		// @ts-expect-error attach status for handlers
		error.status = 400;
		throw error;
	}
	return passwordFromBody;
}


