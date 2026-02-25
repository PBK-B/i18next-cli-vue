import { parse } from '@vue/compiler-sfc';
import { transform } from '@swc/core';
import type { VueSFCParser, VuePluginOptions, VueSFCPart } from '../types';
import { extractTemplateKeys } from '../template/extract';

interface SFCParseResult {
	descriptor: {
		template: { content: string } | null;
		script: { content: string; lang?: string } | null;
		scriptSetup: { content: string; lang?: string } | null;
		styles: Array<{ content: string }>;
		customBlocks: Array<{ type: string; content: string }>;
	};
}

async function transformTypeScript(code: string): Promise<string> {
	try {
		const result = await transform(code, {
			jsc: {
				parser: {
					syntax: 'typescript',
					tsx: false,
					decorators: true,
				},
				target: 'es2020',
			},
		});
		return result.code;
	} catch (err) {
		// 如果转换失败，返回原始代码
		return code;
	}
}

export function createVue3Parser(code: string, options: VuePluginOptions): VueSFCParser {
	const result = parse(code) as unknown as SFCParseResult;
	const descriptor = result.descriptor;

	return {
		extractScript(): string {
			const scriptParts: string[] = [];

			if (descriptor.script?.content) {
				scriptParts.push(descriptor.script.content);
			}

			if (descriptor.scriptSetup?.content) {
				scriptParts.push(descriptor.scriptSetup.content);
			}

			return scriptParts.join('\n');
		},

		async extractScriptAsync(): Promise<string> {
			const scriptParts: string[] = [];

			// 检查是否有 TypeScript
			const isTypeScript =
				descriptor.script?.lang === 'ts' ||
				descriptor.scriptSetup?.lang === 'ts' ||
				descriptor.script?.content?.includes('type ') ||
				descriptor.scriptSetup?.content?.includes('type ') ||
				descriptor.script?.content?.includes('interface ') ||
				descriptor.scriptSetup?.content?.includes('interface ');

			if (descriptor.script?.content) {
				let scriptContent = descriptor.script.content;
				if (isTypeScript || descriptor.script.lang === 'ts') {
					scriptContent = await transformTypeScript(scriptContent);
				}
				scriptParts.push(scriptContent);
			}

			if (descriptor.scriptSetup?.content) {
				let scriptContent = descriptor.scriptSetup.content;
				if (isTypeScript || descriptor.scriptSetup.lang === 'ts') {
					scriptContent = await transformTypeScript(scriptContent);
				}
				scriptParts.push(scriptContent);
			}

			return scriptParts.join('\n');
		},

		extractTemplate(): string {
			return descriptor.template?.content || '';
		},

		extractStyles(): string[] {
			return descriptor.styles.map((style) => style.content);
		},

		extractCustomBlocks(): VueSFCPart[] {
			return descriptor.customBlocks.map((block) => ({
				type: block.type as VueSFCPart['type'],
				content: block.content,
			}));
		},

		generateVirtualJS(): string {
			const template = descriptor.template?.content || '';
			return extractTemplateKeys(template, options);
		},
	};
}
