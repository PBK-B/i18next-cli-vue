import type { NormalizedVuePluginOptions, ExtractedKeyInfo } from '../types';

export function extractScriptKeys(script: string, options: NormalizedVuePluginOptions): ExtractedKeyInfo[] {
	const keys: ExtractedKeyInfo[] = [];

	const functions = options.functions;
	const functionCalls = extractFunctionCalls(script, functions);

	for (const call of functionCalls) {
		const keyInfo = parseFunctionCall(call);
		if (keyInfo) {
			keys.push(keyInfo);
		}
	}

	return keys;
}

interface FunctionCall {
	functionName: string;
	key: string;
	defaultValue?: string;
	options?: Record<string, unknown>;
	start: number;
	end: number;
}

function extractFunctionCalls(script: string, functions: string[]): FunctionCall[] {
	const calls: FunctionCall[] = [];

	const funcPattern = new RegExp(`\\b(${functions.join('|')})\\s*\\(([^)]+)\\)`, 'g');

	let match;
	while ((match = funcPattern.exec(script)) !== null) {
		const fullMatch = match[0];
		const functionName = match[1];
		const argsStr = match[2];

		const keyResult = extractKeyFromArgs(argsStr);
		if (keyResult) {
			calls.push({
				functionName,
				key: keyResult.key,
				defaultValue: keyResult.defaultValue,
				options: keyResult.options,
				start: match.index,
				end: match.index + fullMatch.length,
			});
		}
	}

	return calls;
}

function extractKeyFromArgs(argsStr: string): { key: string; defaultValue?: string; options?: Record<string, unknown> } | null {
	const trimmed = argsStr.trim();

	const keyMatch = trimmed.match(/^['"]([^'"]*)['"]/);

	if (!keyMatch) {
		return null;
	}

	const key = keyMatch[1];
	const afterKey = trimmed.slice(keyMatch[0].length).trim();

	if (!afterKey) {
		return { key };
	}

	if (afterKey.startsWith(',')) {
		const rest = afterKey.slice(1).trim();

		if (rest.startsWith('{')) {
			const optionsEnd = findMatchingBrace(rest);
			if (optionsEnd !== -1) {
				try {
					const optionsStr = rest.slice(0, optionsEnd);
					const parsedOptions = parseOptions(optionsStr);
					if (parsedOptions) {
						const defaultValue = parsedOptions.defaultValue !== undefined ? String(parsedOptions.defaultValue) : undefined;
						return { key, defaultValue, options: parsedOptions };
					}
				} catch {
					return { key };
				}
			}
		} else {
			const defaultValueMatch = rest.match(/^['"]([^'"]*)['"]/);
			if (defaultValueMatch) {
				return { key, defaultValue: defaultValueMatch[1] };
			}
			return { key };
		}
	}

	return { key };
}

function findMatchingBrace(str: string): number {
	let depth = 0;
	let inString = false;
	let stringChar: string | null = null;

	for (let i = 0; i < str.length; i++) {
		const char = str[i];

		if (inString) {
			if (char === stringChar && str[i - 1] !== '\\') {
				inString = false;
				stringChar = null;
			}
			continue;
		}

		if (char === '"' || char === "'") {
			inString = true;
			stringChar = char;
			continue;
		}

		if (char === '{') {
			depth++;
		} else if (char === '}') {
			depth--;
			if (depth === 0) {
				return i;
			}
		}
	}

	return -1;
}

function parseOptions(optionsStr: string): Record<string, unknown> | null {
	if (!optionsStr.startsWith('{') || !optionsStr.endsWith('}')) {
		return null;
	}

	const inner = optionsStr.slice(1, -1);

	try {
		return JSON.parse(`{${inner}}`);
	} catch {
		return null;
	}
}

function parseFunctionCall(call: FunctionCall): ExtractedKeyInfo | null {
	const namespace = extractNamespace(call.key);

	let key = call.key;
	if (namespace) {
		key = key.replace(`${namespace}:`, '');
	}

	return {
		key,
		defaultValue: call.defaultValue,
		namespace,
		options: call.options,
	};
}

function extractNamespace(key: string): string | undefined {
	if (key.includes(':')) {
		return key.split(':')[0];
	}
	return undefined;
}

export function extractKeysFromExpression(expression: string, options: NormalizedVuePluginOptions): string[] {
	const keys: string[] = [];

	const functions = options.functions;
	const funcPattern = new RegExp(`\\b(${functions.join('|')})\\s*\\(\\s*['"]([^'"]+)['"]`, 'g');

	let match;
	while ((match = funcPattern.exec(expression)) !== null) {
		keys.push(match[2]);
	}

	return keys;
}

export function extractContextFromExpression(expression: string, _options: NormalizedVuePluginOptions): string[] {
	const contexts: string[] = [];

	const contextPattern = /context\s*:\s*['"]([^'"]+)['"]/g;

	let match;
	while ((match = contextPattern.exec(expression)) !== null) {
		contexts.push(match[1]);
	}

	return contexts;
}
