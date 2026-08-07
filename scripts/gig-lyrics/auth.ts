import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import { google } from 'googleapis';

const SCOPES = [
	'https://www.googleapis.com/auth/drive',
	'https://www.googleapis.com/auth/documents',
];

const TOKEN_PATH = path.join(process.cwd(), 'scripts', '.google-token.json');
const DEFAULT_CREDENTIALS_PATH = path.join(
	process.cwd(),
	'scripts',
	'google-oauth-credentials.json',
);

interface OAuthClientConfig {
	clientId: string;
	clientSecret: string;
	redirectUri: string;
}

interface StoredToken {
	type: string;
	client_id: string;
	client_secret: string;
	refresh_token?: string;
}

function getCredentialsPath(): string {
	return process.env.GOOGLE_OAUTH_CREDENTIALS_PATH ?? DEFAULT_CREDENTIALS_PATH;
}

async function loadOAuthClientConfig(): Promise<OAuthClientConfig> {
	const credentialsPath = getCredentialsPath();
	const content = await fs.readFile(credentialsPath, 'utf8');
	const credentials = JSON.parse(content) as {
		installed?: { client_id: string; client_secret: string; redirect_uris?: string[] };
		web?: { client_id: string; client_secret: string; redirect_uris?: string[] };
	};

	const config = credentials.installed ?? credentials.web;
	if (!config) {
		throw new Error(
			`Invalid OAuth credentials file at ${credentialsPath}. Download a Desktop OAuth client JSON from Google Cloud Console.`,
		);
	}

	return {
		clientId: config.client_id,
		clientSecret: config.client_secret,
		redirectUri: config.redirect_uris?.[0] ?? 'http://localhost',
	};
}

function createOAuthClient(config: OAuthClientConfig) {
	return new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
}

async function saveToken(config: OAuthClientConfig, refreshToken: string): Promise<void> {
	await fs.writeFile(
		TOKEN_PATH,
		JSON.stringify(
			{
				type: 'authorized_user',
				client_id: config.clientId,
				client_secret: config.clientSecret,
				refresh_token: refreshToken,
			},
			null,
			2,
		),
		'utf8',
	);
}

async function loadSavedRefreshToken(): Promise<StoredToken | null> {
	try {
		const content = await fs.readFile(TOKEN_PATH, 'utf8');
		return JSON.parse(content) as StoredToken;
	} catch {
		return null;
	}
}

async function clearSavedToken(): Promise<void> {
	try {
		await fs.unlink(TOKEN_PATH);
	} catch {
		// Token file may already be missing.
	}
}

function isInvalidGrantError(error: unknown): boolean {
	if (!(error instanceof Error)) return false;

	const apiError = error as Error & {
		response?: { data?: { error?: string } };
	};

	return (
		error.message.includes('invalid_grant') ||
		apiError.response?.data?.error === 'invalid_grant'
	);
}

async function promptForAuthorizationCode(authUrl: string): Promise<string> {
	console.log('\nOpen this URL in your browser to authorize the app:\n');
	console.log(authUrl);
	console.log('');

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	try {
		const code = await rl.question('Paste the authorization code here: ');
		return code.trim();
	} finally {
		rl.close();
	}
}

async function authorizeInteractively(config: OAuthClientConfig) {
	const client = createOAuthClient(config);
	const authUrl = client.generateAuthUrl({
		access_type: 'offline',
		scope: SCOPES,
		prompt: 'consent',
	});

	const code = await promptForAuthorizationCode(authUrl);
	const { tokens } = await client.getToken(code);
	client.setCredentials(tokens);

	if (!tokens.refresh_token) {
		throw new Error(
			'Google did not return a refresh token. Revoke prior access and run again with prompt=consent.',
		);
	}

	await saveToken(config, tokens.refresh_token);
	console.log(`Saved Google token to ${TOKEN_PATH}`);
	return client;
}

export async function getAuthorizedClient() {
	const config = await loadOAuthClientConfig();
	const client = createOAuthClient(config);
	const savedToken = await loadSavedRefreshToken();

	if (savedToken?.refresh_token) {
		client.setCredentials({
			refresh_token: savedToken.refresh_token,
		});

		try {
			await client.getAccessToken();
			return client;
		} catch (error) {
			if (!isInvalidGrantError(error)) throw error;

			console.log(
				'Saved Google token is expired or revoked. Starting authorization again...',
			);
			await clearSavedToken();
		}
	} else {
		console.log('No saved Google token found. Starting one-time authorization...');
	}

	return authorizeInteractively(config);
}

export function createGoogleClients(auth: ReturnType<typeof createOAuthClient>) {
	const drive = google.drive({ version: 'v3', auth });
	const docs = google.docs({ version: 'v1', auth });
	return { drive, docs };
}

export async function promptSelection<T extends { name: string }>(
	items: T[],
	label: string,
	options?: { alwaysPrompt?: boolean; heading?: string },
): Promise<T> {
	if (items.length === 0) {
		throw new Error(`No ${label} found.`);
	}

	if (items.length === 1 && !options?.alwaysPrompt) {
		console.log(`Only one ${label}: ${items[0].name}`);
		return items[0];
	}

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	try {
		console.log(`\n${options?.heading ?? `Available ${label}:`}`);
		items.forEach((item, index) => {
			console.log(`  ${index + 1}. ${item.name}`);
		});

		while (true) {
			const answer = await rl.question(`\nSelect ${label} (1-${items.length}): `);
			const choice = Number.parseInt(answer.trim(), 10);
			if (choice >= 1 && choice <= items.length) {
				return items[choice - 1];
			}
			console.log('Invalid selection. Try again.');
		}
	} finally {
		rl.close();
	}
}

export async function promptOverwrite(fileName: string): Promise<boolean> {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	try {
		while (true) {
			const answer = await rl.question(
				`\n"${fileName}" already exists in Lyrics > Gigs. Overwrite? (y/N): `,
			);
			const normalized = answer.trim().toLowerCase();
			if (normalized === 'y' || normalized === 'yes') return true;
			if (normalized === '' || normalized === 'n' || normalized === 'no') return false;
			console.log('Please enter y or n.');
		}
	} finally {
		rl.close();
	}
}
