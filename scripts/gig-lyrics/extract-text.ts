import type { docs_v1 } from 'googleapis';

export function extractDocumentText(document: docs_v1.Schema$Document): string {
	const paragraphs: string[] = [];

	for (const element of document.body?.content ?? []) {
		if (!element.paragraph) continue;

		const paragraphText = (element.paragraph.elements ?? [])
			.map(part => part.textRun?.content ?? '')
			.join('')
			.replace(/\n$/, '');

		if (paragraphText.trim()) paragraphs.push(paragraphText);
	}

	return paragraphs.join('\n');
}
