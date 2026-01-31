import { authorizeKeepAliveRequest } from '@/app/lib/keep-alive';

const originalEnv = process.env;

describe('Keep-alive authorization', () => {
	beforeEach(() => {
		jest.resetModules();
		process.env = { ...originalEnv };
		delete process.env.KEEP_ALIVE_SECRET;
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	function buildRequest(url: string, headers?: Record<string, string>) {
		return {
			url,
			headers: new Headers(headers),
		};
	}

	it('allows requests when no secret is configured', () => {
		const request = buildRequest('https://example.com/api/keep-alive');
		const result = authorizeKeepAliveRequest(request);
		expect(result).toEqual({ isAuthorized: true });
	});

	it('rejects requests without a token when secret is configured', () => {
		process.env.KEEP_ALIVE_SECRET = 'secret-token';
		const request = buildRequest('https://example.com/api/keep-alive');
		const result = authorizeKeepAliveRequest(request);
		expect(result).toEqual({ isAuthorized: false, failureStatus: 401 });
	});

	it('accepts a matching token from headers', () => {
		process.env.KEEP_ALIVE_SECRET = 'secret-token';
		const request = buildRequest('https://example.com/api/keep-alive', {
			'x-keep-alive-token': 'secret-token',
		});
		const result = authorizeKeepAliveRequest(request);
		expect(result).toEqual({ isAuthorized: true });
	});

	it('accepts a matching token from query params', () => {
		process.env.KEEP_ALIVE_SECRET = 'secret-token';
		const request = buildRequest('https://example.com/api/keep-alive?token=secret-token');
		const result = authorizeKeepAliveRequest(request);
		expect(result).toEqual({ isAuthorized: true });
	});
});

