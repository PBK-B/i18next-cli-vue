import type { Plugin, LintIssue, LintPluginContext } from 'i18next-cli';
import type { VuePluginOptions, NormalizedVuePluginOptions } from './types';
import { normalizeOptions, validateOptions } from './options';
import { createParser, detectVueVersion } from './sfc/parser';
import { extractKeysFromExpression as extractKeysFromExpr, extractContextFromExpression as extractContextFromExpr } from './script/extract';
import { isVueFile } from './utils';
import { extractVueLintIssues } from './lint/extract';

function createOnLoadHandler(normalizedOptions: NormalizedVuePluginOptions): (code: string, path: string) => Promise<string> {
	return async (code: string, path: string): Promise<string> => {
		if (!isVueFile(path, normalizedOptions.filePatterns)) {
			return code;
		}

		const vueVersion = normalizedOptions.vueVersion || detectVueVersion(code);
		const parser = createParser(vueVersion, code, normalizedOptions);

		// 使用异步方法提取脚本内容（支持 TypeScript 编译）
		const scriptContent = parser.extractScriptAsync ? await parser.extractScriptAsync() : parser.extractScript();
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
	const lintIssuesByPath = new Map<string, LintIssue[]>();
	let lintContext: LintPluginContext | undefined;

	const plugin: Plugin = {
		name: 'i18next-cli-vue',

		onLoad: createOnLoadHandler(normalizedOptions),

		lintExtensions: normalizedOptions.filePatterns,

		lintSetup: async (context: LintPluginContext): Promise<void> => {
			lintContext = context;
			lintIssuesByPath.clear();
		},

		lintOnLoad: async (code: string, path: string): Promise<string | undefined> => {
			if (!isVueFile(path, normalizedOptions.filePatterns)) {
				return undefined;
			}

			const vueVersion = normalizedOptions.vueVersion || detectVueVersion(code);
			const parser = createParser(vueVersion, code, normalizedOptions);
			const scriptContent = parser.extractScriptAsync ? await parser.extractScriptAsync() : parser.extractScript();
			const virtualJS = parser.generateVirtualJS();

			lintIssuesByPath.set(path, extractVueLintIssues(code, lintContext?.config));

			if (scriptContent && virtualJS) {
				return `${scriptContent}\n${virtualJS}`;
			}

			return scriptContent || virtualJS || '';
		},

		lintOnResult: async (filePath: string, issues: LintIssue[]): Promise<LintIssue[] | undefined> => {
			if (!isVueFile(filePath, normalizedOptions.filePatterns)) {
				return undefined;
			}

			const extraIssues = lintIssuesByPath.get(filePath);
			if (!extraIssues || extraIssues.length === 0) {
				return issues;
			}

			const merged = [...issues];
			const seen = new Set(issues.map((issue) => `${issue.type ?? 'hardcoded'}:${issue.line}:${issue.text}`));

			for (const issue of extraIssues) {
				const key = `${issue.type ?? 'hardcoded'}:${issue.line}:${issue.text}`;
				if (!seen.has(key)) {
					merged.push(issue);
					seen.add(key);
				}
			}

			return merged;
		},

		extractKeysFromExpression: (_expression: any, _config: any, _logger: any): string[] => {
			return extractKeysFromExpr(_expression, normalizedOptions);
		},

		extractContextFromExpression: (_expression: any, _config: any, _logger: any): string[] => {
			return extractContextFromExpr(_expression, normalizedOptions);
		},
	};

	return plugin;
}

export function extractKeysFromExpression(expression: string, options: NormalizedVuePluginOptions): string[] {
	return extractKeysFromExpr(expression, options);
}

export function extractContextFromExpression(expression: string, options: NormalizedVuePluginOptions): string[] {
	return extractContextFromExpr(expression, options);
}
