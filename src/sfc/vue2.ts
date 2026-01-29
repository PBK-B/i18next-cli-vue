import type { VueSFCParser, VuePluginOptions, VueSFCPart } from '../types';
import { extractTemplateKeys } from '../template/extract';

interface Vue2Descriptor {
	template: string;
	script: string;
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
			styles: [],
			customBlocks: [],
		};
	}

	const result = compiler.parseComponent(code);

	return {
		template: result.template?.content || '',
		script: result.script?.content || '',
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

export function createVue2Parser(code: string, options: VuePluginOptions): VueSFCParser {
	const descriptor = parseVue2SFC(code);

	return {
		extractScript(): string {
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
