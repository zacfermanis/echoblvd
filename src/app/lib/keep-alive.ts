export interface KeepAliveAuthResult {
	isAuthorized: boolean;
	failureStatus?: number;
}

export interface KeepAliveRequestLike {
	url: string;
	headers: Headers;
}

export function getKeepAliveSecret(): string | null {
	return process.env.KEEP_ALIVE_SECRET ?? null;
}

export function getKeepAliveToken(request: KeepAliveRequestLike): string | null {
	const url = new URL(request.url);
	const headerToken = request.headers.get('x-keep-alive-token');
	const queryToken = url.searchParams.get('token');
	return headerToken ?? queryToken;
}

export function authorizeKeepAliveRequest(request: KeepAliveRequestLike): KeepAliveAuthResult {
	const secret = getKeepAliveSecret();
	if (!secret) return { isAuthorized: true };
	const token = getKeepAliveToken(request);
	if (token === secret) return { isAuthorized: true };
	return { isAuthorized: false, failureStatus: 401 };
}

