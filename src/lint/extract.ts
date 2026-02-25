import type { I18nextToolkitConfig, LintIssue } from 'i18next-cli';

const DEFAULT_IGNORED_TAGS = ['script', 'style', 'code'];
const DEFAULT_ACCEPTED_TAGS = [
	'a',
	'abbr',
	'address',
	'article',
	'aside',
	'bdi',
	'bdo',
	'blockquote',
	'button',
	'caption',
	'cite',
	'code',
	'data',
	'dd',
	'del',
	'details',
	'dfn',
	'dialog',
	'div',
	'dt',
	'em',
	'figcaption',
	'footer',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'header',
	'img',
	'ins',
	'kbd',
	'label',
	'legend',
	'li',
	'main',
	'mark',
	'nav',
	'option',
	'output',
	'p',
	'pre',
	'q',
	's',
	'samp',
	'section',
	'small',
	'span',
	'strong',
	'sub',
	'summary',
	'sup',
	'td',
	'textarea',
	'th',
	'time',
	'title',
	'var',
];
const DEFAULT_ACCEPTED_ATTRIBUTES = [
	'abbr',
	'accesskey',
	'alt',
	'aria-description',
	'aria-label',
	'aria-placeholder',
	'aria-roledescription',
	'aria-valuetext',
	'content',
	'label',
	'placeholder',
	'summary',
	'title',
];
const DEFAULT_IGNORED_ATTRIBUTES = ['classname', 'key', 'id', 'style', 'href', 'i18nkey', 'defaults', 'type', 'target'];

interface Token {
	name: string;
	attrs: Array<{ name: string; value: string; line: number }>;
}

interface LintRules {
	ignoredTags: Set<string>;
	ignoredAttributes: Set<string>;
	acceptedTags: Set<string> | null;
	acceptedAttributes: Set<string> | null;
	transComponents: Set<string>;
}

function toList(value: string[] | undefined): string[] {
	if (!Array.isArray(value)) {
		return [];
	}
	return value.map((v) => v.trim().toLowerCase()).filter(Boolean);
}

function buildRules(config: I18nextToolkitConfig | undefined): LintRules {
	const lint = config?.lint;
	const extract = config?.extract;

	const ignoredTags = new Set([...DEFAULT_IGNORED_TAGS, ...toList(extract?.ignoredTags), ...toList(lint?.ignoredTags)]);
	const ignoredAttributes = new Set([...DEFAULT_IGNORED_ATTRIBUTES, ...toList(extract?.ignoredAttributes), ...toList(lint?.ignoredAttributes)]);

	const acceptedTagsSource = lint?.acceptedTags ?? extract?.acceptedTags;
	const acceptedAttributesSource = lint?.acceptedAttributes ?? extract?.acceptedAttributes;

	const acceptedTagsList = toList(acceptedTagsSource);
	const acceptedAttributesList = toList(acceptedAttributesSource);

	const transComponents = new Set(toList(extract?.transComponents ?? ['trans']));

	return {
		ignoredTags,
		ignoredAttributes,
		acceptedTags: acceptedTagsSource !== undefined ? (acceptedTagsList.length > 0 ? new Set(acceptedTagsList) : null) : new Set(DEFAULT_ACCEPTED_TAGS),
		acceptedAttributes:
			acceptedAttributesSource !== undefined ? (acceptedAttributesList.length > 0 ? new Set(acceptedAttributesList) : null) : new Set(DEFAULT_ACCEPTED_ATTRIBUTES),
		transComponents,
	};
}

function isTextCandidate(value: string): boolean {
	const text = value.trim();
	if (!text || text.length <= 1) {
		return false;
	}
	if (text === '...' || /^\d+(\.\d+)?$/.test(text)) {
		return false;
	}
	if (/^(https?:\/\/|\/\/|\/)/.test(text)) {
		return false;
	}
	if (text.startsWith('{{')) {
		return false;
	}
	if (text.includes('|')) {
		return false;
	}
	return true;
}

function isAttributeCandidate(value: string): boolean {
	const text = value.trim();
	if (!text) {
		return false;
	}
	if (text === '...' || /^\d+(\.\d+)?$/.test(text)) {
		return false;
	}
	if (/^(https?:\/\/|\/\/|\/)/.test(text)) {
		return false;
	}
	return true;
}

function countLineBreaks(text: string): number {
	let count = 0;
	for (let i = 0; i < text.length; i++) {
		if (text[i] === '\n') {
			count++;
		}
	}
	return count;
}

function parseTag(rawTag: string, line: number): Token {
	const nameMatch = rawTag.match(/^<\s*([A-Za-z][\w-]*)/);
	const name = nameMatch ? nameMatch[1].toLowerCase() : '';
	const attrs: Array<{ name: string; value: string; line: number }> = [];
	const attrRegex = /([:@A-Za-z_][\w:.-]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
	let m: RegExpExecArray | null;
	while ((m = attrRegex.exec(rawTag)) !== null) {
		const before = rawTag.slice(0, m.index);
		const attrLine = line + countLineBreaks(before);
		attrs.push({
			name: m[1].toLowerCase(),
			value: m[3] ?? m[4] ?? '',
			line: attrLine,
		});
	}
	return { name, attrs };
}

export function extractVueLintIssues(code: string, config?: I18nextToolkitConfig): LintIssue[] {
	const rules = buildRules(config);
	const issues: LintIssue[] = [];

	const tokenRegex = /<[^>]+>|[^<]+/g;
	const stack: string[] = [];
	let line = 1;
	let tokenMatch: RegExpExecArray | null;

	while ((tokenMatch = tokenRegex.exec(code)) !== null) {
		const token = tokenMatch[0];

		if (token.startsWith('<')) {
			const trimmed = token.trim();
			if (/^<!--/.test(trimmed) || /^<!/.test(trimmed) || /^<\?/.test(trimmed)) {
				line += countLineBreaks(token);
				continue;
			}

			if (/^<\//.test(trimmed)) {
				const closeName = trimmed.replace(/^<\//, '').replace(/\s*>$/, '').trim().toLowerCase();
				for (let i = stack.length - 1; i >= 0; i--) {
					const name = stack[i];
					stack.pop();
					if (name === closeName) {
						break;
					}
				}
				line += countLineBreaks(token);
				continue;
			}

			const parsed = parseTag(token, line);
			const isSelfClosing = /\/\s*>$/.test(trimmed);

			const inIgnoredTree = stack.some((name) => rules.ignoredTags.has(name) || rules.transComponents.has(name));
			const thisIgnored = rules.ignoredTags.has(parsed.name) || rules.transComponents.has(parsed.name);
			const allowTagText = !inIgnoredTree && !thisIgnored && (rules.acceptedTags ? rules.acceptedTags.has(parsed.name) : true);

			for (const attr of parsed.attrs) {
				if (attr.name.startsWith(':') || attr.name.startsWith('@') || attr.name.startsWith('v-')) {
					continue;
				}
				if (inIgnoredTree || thisIgnored) {
					continue;
				}
				if (rules.acceptedTags && !rules.acceptedTags.has(parsed.name)) {
					continue;
				}

				const acceptedByAttr = rules.acceptedAttributes ? rules.acceptedAttributes.has(attr.name) : !rules.ignoredAttributes.has(attr.name);
				if (!acceptedByAttr || !isAttributeCandidate(attr.value)) {
					continue;
				}

				issues.push({
					text: attr.value.trim(),
					line: attr.line,
					type: 'hardcoded',
				});
			}

			if (!isSelfClosing) {
				stack.push(parsed.name || '');
			}

			if (!allowTagText) {
				line += countLineBreaks(token);
				continue;
			}
		} else {
			const current = stack[stack.length - 1];
			const inIgnoredTree = stack.some((name) => rules.ignoredTags.has(name) || rules.transComponents.has(name));
			const attributeOnlyMode = !!rules.acceptedAttributes && !rules.acceptedTags;
			const isAcceptedTag = current ? (rules.acceptedTags ? rules.acceptedTags.has(current) : true) : false;

			if (!inIgnoredTree && !attributeOnlyMode && isAcceptedTag && isTextCandidate(token)) {
				issues.push({
					text: token.trim(),
					line,
					type: 'hardcoded',
				});
			}
		}

		line += countLineBreaks(token);
	}

	return issues;
}
