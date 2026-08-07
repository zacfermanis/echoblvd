import type { docs_v1 } from 'googleapis';

const HORIZONTAL_RULE_BORDER = {
	color: { color: { rgbColor: { red: 0, green: 0, blue: 0 } } },
	width: { magnitude: 1, unit: 'PT' as const },
	padding: { magnitude: 1, unit: 'PT' as const },
	dashStyle: 'SOLID' as const,
};

export function buildGigLyricsInsertRequests(
	sections: string[],
	startIndex = 1,
): docs_v1.Schema$Request[] {
	const requests: docs_v1.Schema$Request[] = [];
	let index = startIndex;

	for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
		if (sectionIndex > 0) {
			const ruleText = '\n';
			requests.push({
				insertText: {
					location: { index },
					text: ruleText,
				},
			});

			const ruleStart = index;
			const ruleEnd = index + ruleText.length;
			index = ruleEnd;

			requests.push({
				updateParagraphStyle: {
					range: { startIndex: ruleStart, endIndex: ruleEnd },
					paragraphStyle: { borderBottom: HORIZONTAL_RULE_BORDER },
					fields: 'borderBottom',
				},
			});

			requests.push({
				insertPageBreak: {
					location: { index },
				},
			});
			index += 1;
		}

		const sectionText = `${sections[sectionIndex]}\n`;
		requests.push({
			insertText: {
				location: { index },
				text: sectionText,
			},
		});
		index += sectionText.length;
	}

	return requests;
}
