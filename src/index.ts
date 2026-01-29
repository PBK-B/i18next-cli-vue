import type { Plugin } from 'i18next-cli';
import type { VuePluginOptions, NormalizedVuePluginOptions } from './types';
import { normalizeOptions, validateOptions } from './options';
import { createParser, detectVueVersion } from './sfc/parser';
import { extractKeysFromExpression as extractKeysFromExpr, extractContextFromExpression as extractContextFromExpr } from './script/extract';
import { isVueFile } from './utils';

function createOnLoadHandler(normalizedOptions: NormalizedVuePluginOptions): (code: string, path: string) => string {
	return (code: string, path: string): string => {
		if (!isVueFile(path, normalizedOptions.filePatterns)) {
			return code;
		}

		const vueVersion = normalizedOptions.vueVersion || detectVueVersion(code);
		const parser = createParser(vueVersion, code, normalizedOptions);

		const scriptContent = parser.extractScript();
		const virtualJS = parser.generateVirtualJS();

		if (scriptContent && virtualJS) {
			return `${scriptContent}\n${virtualJS}`;
		}

		return scriptContent || virtualJS;
	};
}

export default function i18nextVuePlugin(options: VuePluginOptions = {}): Plugin {
	const normalizedOptions = normalizeOptions(options);
	validateOptions(normalizedOptions);

	return {
		name: 'i18next-cli-vue',

		onLoad: createOnLoadHandler(normalizedOptions),

		extractKeysFromExpression: (_expression: any, _config: any, _logger: any): string[] => {
			return [];
		},

		extractContextFromExpression: (_expression: any, _config: any, _logger: any): string[] => {
			return [];
		},
	};
}

export function extractKeysFromExpression(expression: string, options: NormalizedVuePluginOptions): string[] {
	return extractKeysFromExpr(expression, options);
}

export function extractContextFromExpression(expression: string, options: NormalizedVuePluginOptions): string[] {
	return extractContextFromExpr(expression, options);
}
