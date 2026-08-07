import type { docs_v1 } from 'googleapis';

const DEFAULT_WRITE_BATCH_SIZE = 500;
const DEFAULT_QUOTA_UNITS_PER_MINUTE = 900_000;
const DEFAULT_BATCH_UPDATE_QUOTA_COST = 100;
const MAX_RETRY_ATTEMPTS = 6;

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export function chunkRequests<T>(requests: T[], batchSize: number): T[][] {
	const chunks: T[][] = [];

	for (let index = 0; index < requests.length; index += batchSize) {
		chunks.push(requests.slice(index, index + batchSize));
	}

	return chunks;
}

export function pauseMsForBatchUpdate(
	quotaUnitsPerBatch = DEFAULT_BATCH_UPDATE_QUOTA_COST,
	quotaUnitsPerMinute = DEFAULT_QUOTA_UNITS_PER_MINUTE,
): number {
	if (quotaUnitsPerBatch <= 0 || quotaUnitsPerMinute <= 0) return 0;

	const batchesPerMinute = quotaUnitsPerMinute / quotaUnitsPerBatch;
	return Math.ceil(60_000 / batchesPerMinute);
}

function isRateLimitError(error: unknown): boolean {
	if (!(error instanceof Error)) return false;

	const apiError = error as Error & {
		code?: number;
		response?: { status?: number; headers?: Record<string, string | string[] | undefined> };
	};

	if (apiError.code === 429 || apiError.response?.status === 429) return true;

	const message = apiError.message.toLowerCase();
	return message.includes('quota exceeded') || message.includes('ratelimitexceeded');
}

function getRetryDelayMs(error: unknown, attempt: number): number {
	const retryAfter = (error as { response?: { headers?: Record<string, string | string[] | undefined> } })
		.response?.headers?.['retry-after'];

	if (typeof retryAfter === 'string') {
		const seconds = Number.parseInt(retryAfter, 10);
		if (!Number.isNaN(seconds)) return seconds * 1000;
	}

	return Math.min(90_000, 10_000 * 2 ** attempt);
}

function getWriteBatchSize(): number {
	const configured = Number.parseInt(process.env.GOOGLE_DOCS_WRITE_BATCH_SIZE ?? '', 10);
	return Number.isFinite(configured) && configured > 0
		? configured
		: DEFAULT_WRITE_BATCH_SIZE;
}

function getQuotaUnitsPerMinute(): number {
	const configured = Number.parseInt(process.env.GOOGLE_DOCS_QUOTA_UNITS_PER_MINUTE ?? '', 10);
	return Number.isFinite(configured) && configured > 0
		? configured
		: DEFAULT_QUOTA_UNITS_PER_MINUTE;
}

function getBatchUpdateQuotaCost(): number {
	const configured = Number.parseInt(process.env.GOOGLE_DOCS_BATCH_UPDATE_QUOTA_COST ?? '', 10);
	return Number.isFinite(configured) && configured > 0
		? configured
		: DEFAULT_BATCH_UPDATE_QUOTA_COST;
}

async function batchUpdateWithRetry(
	docs: docs_v1.Docs,
	documentId: string,
	requests: docs_v1.Schema$Request[],
): Promise<void> {
	for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
		try {
			await docs.documents.batchUpdate({
				documentId,
				requestBody: { requests },
			});
			return;
		} catch (error) {
			if (!isRateLimitError(error) || attempt === MAX_RETRY_ATTEMPTS - 1) {
				throw error;
			}

			const delayMs = getRetryDelayMs(error, attempt);
			console.log(
				`  Google Docs rate limit hit. Waiting ${Math.round(delayMs / 1000)}s before retry...`,
			);
			await sleep(delayMs);
		}
	}
}

export async function applyDocumentRequests(
	docs: docs_v1.Docs,
	documentId: string,
	requests: docs_v1.Schema$Request[],
): Promise<void> {
	if (requests.length === 0) return;

	const batchSize = getWriteBatchSize();
	const quotaUnitsPerMinute = getQuotaUnitsPerMinute();
	const batchUpdateQuotaCost = getBatchUpdateQuotaCost();
	const chunks = chunkRequests(requests, batchSize);
	const pauseMs = pauseMsForBatchUpdate(batchUpdateQuotaCost, quotaUnitsPerMinute);

	for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
		const chunk = chunks[chunkIndex];
		console.log(
			`  Writing batch ${chunkIndex + 1}/${chunks.length} (${chunk.length} operations)...`,
		);
		await batchUpdateWithRetry(docs, documentId, chunk);

		if (chunkIndex < chunks.length - 1 && pauseMs > 0) {
			await sleep(pauseMs);
		}
	}
}
