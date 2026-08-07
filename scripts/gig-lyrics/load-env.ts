import fs from 'node:fs';
import path from 'node:path';

function parseEnvValue(rawValue: string): string {
	let value = rawValue.trim();
	const inlineComment = value.match(/^(.*?)(?:\s+#\s.*)$/);
	if (inlineComment) value = inlineComment[1].trim();

	if (
		(value.startsWith('"') && value.endsWith('"')) ||
		(value.startsWith("'") && value.endsWith("'"))
	) {
		value = value.slice(1, -1);
	}

	return value;
}

export function loadLocalEnv(): void {
	const envFiles = ['.env.local', '.env'];

	for (const envFile of envFiles) {
		const envPath = path.join(process.cwd(), envFile);
		if (!fs.existsSync(envPath)) continue;

		const content = fs.readFileSync(envPath, 'utf8');
		for (const line of content.split(/\r?\n/)) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith('#')) continue;

			const separatorIndex = trimmed.indexOf('=');
			if (separatorIndex === -1) continue;

			const key = trimmed.slice(0, separatorIndex).trim();
			const value = parseEnvValue(trimmed.slice(separatorIndex + 1));
			if (!key || process.env[key] != null) continue;

			process.env[key] = value;
		}
	}
}
