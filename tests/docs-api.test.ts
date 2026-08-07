import {
	chunkRequests,
	pauseMsForBatchUpdate,
} from '../scripts/gig-lyrics/docs-api';

describe('docs-api throttling helpers', () => {
	it('chunks requests into fixed-size batches', () => {
		expect(chunkRequests([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
	});

	it('calculates pause duration from batchUpdate quota units', () => {
		expect(pauseMsForBatchUpdate(100, 900_000)).toBe(7);
		expect(pauseMsForBatchUpdate(100, 1_000_000)).toBe(6);
	});
});
