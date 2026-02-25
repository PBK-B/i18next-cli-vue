import type { VueSFCParser, VuePluginOptions, VueSFCPart } from '../types';
import { transform } from '@swc/core';
import { extractTemplateKeys } from '../template/extract';

interface Vue2Descriptor {
	template: string;
	script: string;
	scriptLang?: string;
	styles: string[];
	customBlocks: { type: string; content: string }[];
}

let vueTemplateCompiler: typeof import('vue-template-compiler') | null = null;

function loadVueTemplateCompiler() {
	if (!vueTemplateCompiler) {
		try {
			vueTemplateCompiler = require('vue-template-compiler');
		} catch {
			vueTemplateCompiler = null;
		}
	}
	return vueTemplateCompiler;
}

function parseVue2SFC(code: string): Vue2Descriptor {
	const compiler = loadVueTemplateCompiler();

	if (!compiler) {
		return {
			template: extractVueTemplate(code),
			script: extractVueScript(code),
			scriptLang: extractVueScriptLang(code),
			styles: [],
			customBlocks: [],
		};
	}

	const result = compiler.parseComponent(code);

	return {
		template: result.template?.content || '',
		script: result.script?.content || '',
		scriptLang: result.script?.lang,
		styles: result.styles.map((style: { content: string }) => style.content),
		customBlocks: result.customBlocks.map((block: { type: string; content: string }) => ({
			type: block.type,
			content: block.content,
		})),
	};
}

function extractVueTemplate(code: string): string {
	const templateMatch = code.match(/<template[^>]*>([\s\S]*?)<\/template>/);
	return templateMatch ? templateMatch[1] : '';
}

function extractVueScript(code: string): string {
	const scriptMatch = code.match(/<script[^>]*>([\s\S]*?)<\/script>/);
	return scriptMatch ? scriptMatch[1] : '';
}

function extractVueScriptLang(code: string): string | undefined {
	const scriptTag = code.match(/<script([^>]*)>/);
	if (!scriptTag) {
		return undefined;
	}

	const langMatch = scriptTag[1].match(/\blang\s*=\s*['"]([^'"]+)['"]/);
	return langMatch ? langMatch[1] : undefined;
}

function looksLikeTypeScript(script: string): boolean {
	return /\binterface\s+[A-Za-z_]/.test(script) || /\btype\s+[A-Za-z_]/.test(script) || /:\s*[A-Za-z_][\w<>,\s|&?]*(?:\[\])?/.test(script);
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
	} catch {
		return code;
	}
}

export function createVue2Parser(code: string, options: VuePluginOptions): VueSFCParser {
	const descriptor = parseVue2SFC(code);

	return {
		extractScript(): string {
			return descriptor.script;
		},

		extractScriptAsync: async (): Promise<string> => {
			if (!descriptor.script) {
				return '';
			}

			const lang = descriptor.scriptLang?.toLowerCase();
			if (lang === 'ts' || lang === 'tsx' || looksLikeTypeScript(descriptor.script)) {
				return transformTypeScript(descriptor.script);
			}

			return descriptor.script;
		},

		extractTemplate(): string {
			return descriptor.template;
		},

		extractStyles(): string[] {
			return descriptor.styles;
		},

		extractCustomBlocks(): VueSFCPart[] {
			return descriptor.customBlocks.map((block) => ({
				type: block.type as VueSFCPart['type'],
				content: block.content,
			}));
		},

		generateVirtualJS(): string {
			return extractTemplateKeys(descriptor.template, options);
		},
	};
}
