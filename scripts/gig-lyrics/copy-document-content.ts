import type { docs_v1 } from 'googleapis';

const HORIZONTAL_RULE_BORDER = {
	color: { color: { rgbColor: { red: 0, green: 0, blue: 0 } } },
	width: { magnitude: 1, unit: 'PT' as const },
	padding: { magnitude: 1, unit: 'PT' as const },
	dashStyle: 'SOLID' as const,
};

const PARAGRAPH_STYLE_KEYS = [
	'namedStyleType',
	'alignment',
	'lineSpacing',
	'direction',
	'spacingMode',
	'spaceAbove',
	'spaceBelow',
	'indentStart',
	'indentEnd',
	'indentFirstLine',
	'tabStops',
	'keepLinesTogether',
	'keepWithNext',
	'avoidWidowAndOrphan',
	'shading',
	'borderTop',
	'borderBottom',
	'borderLeft',
	'borderRight',
] as const;

const TEXT_STYLE_KEYS = [
	'bold',
	'italic',
	'underline',
	'strikethrough',
	'smallCaps',
	'backgroundColor',
	'foregroundColor',
	'fontSize',
	'weightedFontFamily',
	'baselineOffset',
	'link',
] as const;

interface TextSegment {
	text: string;
	textStyle?: docs_v1.Schema$TextStyle;
}

function pickDefinedFields<T extends Record<string, unknown>>(
	source: T | null | undefined,
	keys: readonly (keyof T)[],
): Partial<T> | undefined {
	if (!source) return undefined;

	const picked: Partial<T> = {};
	for (const key of keys) {
		if (source[key] != null) picked[key] = source[key];
	}

	return Object.keys(picked).length > 0 ? picked : undefined;
}

export function paragraphStyleFields(
	paragraphStyle: docs_v1.Schema$ParagraphStyle | null | undefined,
	includeBorderBottom = false,
): string | undefined {
	const style = pickDefinedFields(
		paragraphStyle as Record<string, unknown> | null | undefined,
		PARAGRAPH_STYLE_KEYS as unknown as (keyof Record<string, unknown>)[],
	);

	if (includeBorderBottom && !style?.borderBottom) {
		return paragraphStyleFields(
			{ ...paragraphStyle, borderBottom: HORIZONTAL_RULE_BORDER },
			false,
		);
	}

	return style ? Object.keys(style).join(',') : undefined;
}

export function textStyleFields(
	textStyle: docs_v1.Schema$TextStyle | null | undefined,
): string | undefined {
	const style = pickDefinedFields(
		textStyle as Record<string, unknown> | null | undefined,
		TEXT_STYLE_KEYS as unknown as (keyof Record<string, unknown>)[],
	);
	return style ? Object.keys(style).join(',') : undefined;
}

function paragraphHasHorizontalRule(
	elements: docs_v1.Schema$ParagraphElement[],
): boolean {
	return elements.some(element => element.horizontalRule);
}

function paragraphHasPageBreak(elements: docs_v1.Schema$ParagraphElement[]): boolean {
	return elements.some(element => element.pageBreak);
}

function getParagraphSegments(
	elements: docs_v1.Schema$ParagraphElement[],
): TextSegment[] {
	const segments: TextSegment[] = [];

	for (const element of elements) {
		if (!element.textRun?.content) continue;
		segments.push({
			text: element.textRun.content,
			textStyle: element.textRun.textStyle ?? undefined,
		});
	}

	return segments;
}

export function buildCopyDocumentRequests(
	document: docs_v1.Schema$Document,
	startIndex: number,
): { requests: docs_v1.Schema$Request[]; endIndex: number } {
	const requests: docs_v1.Schema$Request[] = [];
	let index = startIndex;

	for (const element of document.body?.content ?? []) {
		if (!element.paragraph) continue;

		const paragraph = element.paragraph;
		const elements = paragraph.elements ?? [];

		if (paragraphHasPageBreak(elements)) {
			requests.push({ insertPageBreak: { location: { index } } });
			index += 1;
			continue;
		}

		if (paragraphHasHorizontalRule(elements)) {
			const ruleText = '\n';
			const paragraphStart = index;
			requests.push({
				insertText: {
					location: { index },
					text: ruleText,
				},
			});
			index += ruleText.length;

			const paragraphStyle = pickDefinedFields(
				paragraph.paragraphStyle as Record<string, unknown> | null | undefined,
				PARAGRAPH_STYLE_KEYS as unknown as (keyof Record<string, unknown>)[],
			);
			const styledParagraph = {
				...paragraphStyle,
				borderBottom:
					paragraph.paragraphStyle?.borderBottom ?? HORIZONTAL_RULE_BORDER,
			};
			const fields = paragraphStyleFields(styledParagraph, true);

			if (fields) {
				requests.push({
					updateParagraphStyle: {
						range: { startIndex: paragraphStart, endIndex: index },
						paragraphStyle: styledParagraph,
						fields,
					},
				});
			}

			continue;
		}

		const segments = getParagraphSegments(elements);
		const fullText = segments.map(segment => segment.text).join('');
		if (!fullText) continue;

		const paragraphStart = index;
		requests.push({
			insertText: {
				location: { index },
				text: fullText,
			},
		});
		index += fullText.length;

		let segmentStart = paragraphStart;
		for (const segment of segments) {
			const segmentEnd = segmentStart + segment.text.length;
			const fields = textStyleFields(segment.textStyle);
			const textStyle = pickDefinedFields(
				segment.textStyle as Record<string, unknown> | null | undefined,
				TEXT_STYLE_KEYS as unknown as (keyof Record<string, unknown>)[],
			);

			if (textStyle && fields) {
				requests.push({
					updateTextStyle: {
						range: { startIndex: segmentStart, endIndex: segmentEnd },
						textStyle,
						fields,
					},
				});
			}

			segmentStart = segmentEnd;
		}

		const paragraphStyle = pickDefinedFields(
			paragraph.paragraphStyle as Record<string, unknown> | null | undefined,
			PARAGRAPH_STYLE_KEYS as unknown as (keyof Record<string, unknown>)[],
		);
		const fields = paragraphStyleFields(paragraphStyle);

		if (paragraphStyle && fields) {
			requests.push({
				updateParagraphStyle: {
					range: { startIndex: paragraphStart, endIndex: index },
					paragraphStyle,
					fields,
				},
			});
		}
	}

	return { requests, endIndex: index };
}

export function buildSongSeparatorRequests(startIndex: number): {
	requests: docs_v1.Schema$Request[];
	endIndex: number;
} {
	const requests: docs_v1.Schema$Request[] = [];
	let index = startIndex;

	const ruleText = '\n';
	const ruleStart = index;
	requests.push({
		insertText: {
			location: { index },
			text: ruleText,
		},
	});
	index += ruleText.length;

	requests.push({
		updateParagraphStyle: {
			range: { startIndex: ruleStart, endIndex: index },
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

	return { requests, endIndex: index };
}
