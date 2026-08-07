import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadLocalEnv } from '../scripts/gig-lyrics/load-env';

describe('loadLocalEnv', () => {
	it('loads values from .env.local when not already set in process.env', () => {
		const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gig-lyrics-env-'));
		const originalCwd = process.cwd();
		const originalValue = process.env.GOOGLE_DRIVE_ECHOBLVD_FOLDER_ID;

		try {
			fs.writeFileSync(
				path.join(tempDir, '.env.local'),
				'GOOGLE_DRIVE_ECHOBLVD_FOLDER_ID=folder-id-from-env\n',
				'utf8',
			);
			delete process.env.GOOGLE_DRIVE_ECHOBLVD_FOLDER_ID;
			process.chdir(tempDir);
			loadLocalEnv();
			expect(process.env.GOOGLE_DRIVE_ECHOBLVD_FOLDER_ID).toBe('folder-id-from-env');
		} finally {
			process.chdir(originalCwd);
			if (originalValue == null) delete process.env.GOOGLE_DRIVE_ECHOBLVD_FOLDER_ID;
			else process.env.GOOGLE_DRIVE_ECHOBLVD_FOLDER_ID = originalValue;
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	});

	it('strips inline comments from env values', () => {
		const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gig-lyrics-env-'));
		const originalCwd = process.cwd();
		const originalValue = process.env.GOOGLE_DRIVE_ECHOBLVD_FOLDER_ID;

		try {
			fs.writeFileSync(
				path.join(tempDir, '.env.local'),
				'GOOGLE_DRIVE_ECHOBLVD_FOLDER_ID=abc123 # server-only\n',
				'utf8',
			);
			delete process.env.GOOGLE_DRIVE_ECHOBLVD_FOLDER_ID;
			process.chdir(tempDir);
			loadLocalEnv();
			expect(process.env.GOOGLE_DRIVE_ECHOBLVD_FOLDER_ID).toBe('abc123');
		} finally {
			process.chdir(originalCwd);
			if (originalValue == null) delete process.env.GOOGLE_DRIVE_ECHOBLVD_FOLDER_ID;
			else process.env.GOOGLE_DRIVE_ECHOBLVD_FOLDER_ID = originalValue;
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	});
});
