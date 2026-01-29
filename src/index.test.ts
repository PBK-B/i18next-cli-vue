import { describe, it, expect } from 'vitest';
import i18nextVuePlugin from './index';
import { normalizeOptions, validateOptions, DEFAULT_OPTIONS } from './options';
import { detectVueVersion, createParser } from './sfc/parser';
import { extractTemplateKeys } from './template/extract';
import { extractScriptKeys, extractKeysFromExpression, extractContextFromExpression } from './script/extract';
import { isVueFile } from './utils';

describe('i18next-cli-vue', () => {
	describe('Plugin Initialization', () => {
		it('should create plugin with default options', () => {
			const plugin = i18nextVuePlugin();
			expect(plugin.name).toBe('i18next-cli-vue');
			expect(plugin.onLoad).toBeDefined();
		});

		it('should create plugin with custom options', () => {
			const plugin = i18nextVuePlugin({
				vueVersion: 3,
				vueBindAttr: false,
				functions: ['translate'],
				namespaceFunctions: ['withI18n'],
				attr: 'i18n-key',
				optionAttr: 'i18n-options',
				filePatterns: ['.vue'],
			});

			expect(plugin.name).toBe('i18next-cli-vue');
		});
	});

	describe('Options Normalization', () => {
		it('should return default options when no options provided', () => {
			const normalized = normalizeOptions();
			expect(normalized).toEqual(DEFAULT_OPTIONS);
		});

		it('should merge user options with defaults', () => {
			const normalized = normalizeOptions({
				vueVersion: 2,
				functions: ['customT'],
			});

			expect(normalized.vueVersion).toBe(2);
			expect(normalized.functions).toEqual(['customT']);
			expect(normalized.namespaceFunctions).toEqual(DEFAULT_OPTIONS.namespaceFunctions);
		});

		it('should override all defaults when all options provided', () => {
			const customOptions = {
				vueVersion: 3,
				vueBindAttr: false,
				functions: ['t', '$t', 'trans'],
				namespaceFunctions: ['useI18n'],
				attr: 'i18n',
				optionAttr: 'i18n-opts',
				filePatterns: ['.nvue'],
			};

			const normalized = normalizeOptions(customOptions);

			expect(normalized).toEqual(customOptions);
		});
	});

	describe('Options Validation', () => {
		it('should throw error for invalid vueVersion', () => {
			const options = normalizeOptions({ vueVersion: 4 as any });
			expect(() => validateOptions(options)).toThrow('Invalid vueVersion: 4');
		});

		it('should throw error for empty functions array', () => {
			const options = normalizeOptions({ functions: [] });
			expect(() => validateOptions(options)).toThrow('functions must be a non-empty array');
		});

		it('should throw error for empty namespaceFunctions array', () => {
			const options = normalizeOptions({ namespaceFunctions: [] });
			expect(() => validateOptions(options)).toThrow('namespaceFunctions must be a non-empty array');
		});

		it('should throw error for empty attr', () => {
			const options = normalizeOptions({ attr: '' });
			expect(() => validateOptions(options)).toThrow('attr must be a non-empty string');
		});

		it('should throw error for empty filePatterns array', () => {
			const options = normalizeOptions({ filePatterns: [] });
			expect(() => validateOptions(options)).toThrow('filePatterns must be a non-empty array');
		});
	});

	describe('Vue Version Detection', () => {
		it('should detect Vue 3 with script setup', () => {
			const code = '<script setup>\nconst t = useTranslation()\n</script>';
			expect(detectVueVersion(code)).toBe(3);
		});

		it('should detect Vue 3 with defineComponent', () => {
			const code = '<script>\nexport default defineComponent({\n})\n</script>';
			expect(detectVueVersion(code)).toBe(3);
		});

		it('should detect Vue 2 with data()', () => {
			const code = '<script>\nexport default {\n  data() {\n    return {}\n  }\n}\n</script>';
			expect(detectVueVersion(code)).toBe(2);
		});

		it('should default to Vue 3 for unknown files', () => {
			const code = '<template><div></div></template>';
			expect(detectVueVersion(code)).toBe(3);
		});
	});

	describe('File Detection', () => {
		const patterns = ['.vue', '.nvue'];

		it('should return true for .vue files', () => {
			expect(isVueFile('App.vue', patterns)).toBe(true);
			expect(isVueFile('components/MyComponent.vue', patterns)).toBe(true);
		});

		it('should return true for .nvue files', () => {
			expect(isVueFile('App.nvue', patterns)).toBe(true);
		});

		it('should return false for non-vue files', () => {
			expect(isVueFile('App.js', patterns)).toBe(false);
			expect(isVueFile('App.ts', patterns)).toBe(false);
			expect(isVueFile('App.vuex', patterns)).toBe(false);
		});
	});

	describe('SFC Parser', () => {
		it('should create Vue 3 parser', () => {
			const code = '<template><div></div></template>\n<script setup></script>';
			const parser = createParser(3, code, normalizeOptions());

			expect(parser.extractScript()).toBeDefined();
			expect(parser.extractTemplate()).toBeDefined();
			expect(parser.generateVirtualJS()).toBeDefined();
		});

		it('should create Vue 2 parser', () => {
			const code = '<template><div></div></template>\n<script></script>';
			const parser = createParser(2, code, normalizeOptions());

			expect(parser.extractScript()).toBeDefined();
			expect(parser.extractTemplate()).toBeDefined();
		});
	});

	describe('Template Key Extraction', () => {
		const options = normalizeOptions();

		it('should extract keys from data-i18n attribute', () => {
			const template = '<span data-i18n="welcome.message">Hello</span>';
			const result = extractTemplateKeys(template, options);

			expect(result).toContain("t('welcome.message')");
		});

		it('should extract multiple keys separated by semicolon', () => {
			const template = '<span data-i18n="key1;key2;key3"></span>';
			const result = extractTemplateKeys(template, options);

			expect(result).toContain("t('key1')");
			expect(result).toContain("t('key2')");
			expect(result).toContain("t('key3')");
		});

		it('should handle empty template', () => {
			expect(extractTemplateKeys('', options)).toBe('');
			expect(extractTemplateKeys(null as any, options)).toBe('');
		});

		it('should not extract non-i18n attributes', () => {
			const template = '<span class="test" id="btn"></span>';
			const result = extractTemplateKeys(template, options);

			expect(result).toBe('');
		});
	});

	describe('Script Key Extraction', () => {
		const options = normalizeOptions();

		it('should extract simple t() calls', () => {
			const script = "t('welcome.message')";
			const keys = extractScriptKeys(script, options);

			expect(keys).toHaveLength(1);
			expect(keys[0].key).toBe('welcome.message');
		});

		it('should extract t() calls with default value', () => {
			const script = "t('key', 'Default Value')";
			const keys = extractScriptKeys(script, options);

			expect(keys).toHaveLength(1);
			expect(keys[0].key).toBe('key');
			expect(keys[0].defaultValue).toBe('Default Value');
		});

		it('should extract $t() calls', () => {
			const script = "$t('greeting')";
			const keys = extractScriptKeys(script, options);

			expect(keys).toHaveLength(1);
			expect(keys[0].key).toBe('greeting');
		});

		it('should extract keys with namespace', () => {
			const script = "t('common:welcome')";
			const keys = extractScriptKeys(script, options);

			expect(keys).toHaveLength(1);
			expect(keys[0].key).toBe('welcome');
			expect(keys[0].namespace).toBe('common');
		});

		it('should extract multiple keys', () => {
			const script = `
        t('key1')
        t('key2')
        $t('key3')
      `;

			const keys = extractScriptKeys(script, options);

			expect(keys).toHaveLength(3);
			expect(keys.map((k) => k.key)).toEqual(['key1', 'key2', 'key3']);
		});
	});

	describe('Expression Key Extraction', () => {
		const options = normalizeOptions();

		it('should extract keys from expression', () => {
			const result = extractKeysFromExpression("t('test.key')", options);
			expect(result).toEqual(['test.key']);
		});

		it('should return multiple keys', () => {
			const result = extractKeysFromExpression("t('key1'); t('key2')", options);
			expect(result).toEqual(['key1', 'key2']);
		});

		it('should return empty array for non-i18n expression', () => {
			const result = extractKeysFromExpression('someOther()', options);
			expect(result).toEqual([]);
		});
	});

	describe('Context Extraction', () => {
		const options = normalizeOptions();

		it('should extract context from expression', () => {
			const result = extractContextFromExpression("t('user.name', { context: 'male' })", options);
			expect(result).toEqual(['male']);
		});

		it('should extract multiple contexts', () => {
			const result = extractContextFromExpression("t('user.name', { context: 'male' }); t('user.name', { context: 'female' })", options);
			expect(result).toEqual(['male', 'female']);
		});

		it('should return empty array for expression without context', () => {
			const result = extractContextFromExpression("t('key')", options);
			expect(result).toEqual([]);
		});
	});

	describe('onLoad Handler', () => {
		it('should pass through non-vue files', () => {
			const plugin = i18nextVuePlugin();
			const code = 'const x = 1;';
			const result = plugin.onLoad!(code, 'App.ts');

			expect(result).toBe(code);
		});

		it('should process vue files', () => {
			const plugin = i18nextVuePlugin();
			const vueCode = `<template>
  <span data-i18n="test.key"></span>
</template>
<script>
t('script.key')
</script>`;
			const result = plugin.onLoad!(vueCode, 'App.vue');

			expect(result).toContain("t('test.key')");
			expect(result).toContain("t('script.key')");
		});

		it('should handle files with custom filePatterns', () => {
			const plugin = i18nextVuePlugin({ filePatterns: ['.nvue'] });
			const vueCode = `<template>
  <span data-i18n="test.key"></span>
</template>`;
			const result = plugin.onLoad!(vueCode, 'App.nvue');

			expect(result).toContain("t('test.key')");
		});

		it('should skip non-matching file extensions', () => {
			const plugin = i18nextVuePlugin({ filePatterns: ['.vue'] });
			const code = 't("test")';
			const result = plugin.onLoad!(code, 'App.nvue');

			expect(result).toBe(code);
		});

		it('should return empty for vue file with no content', () => {
			const plugin = i18nextVuePlugin();
			const code = 't("test")';
			const result = plugin.onLoad!(code, 'App.vue');

			expect(result).toBe('');
		});
	});

	describe('Vue 3 Composition API', () => {
		it('should extract keys from script setup', () => {
			const options = normalizeOptions({});
			const script = `t('welcome.message')`;

			const keys = extractScriptKeys(script, options);

			expect(keys).toHaveLength(1);
			expect(keys[0].key).toBe('welcome.message');
		});

		it('should extract keys with default value string', () => {
			const options = normalizeOptions({});
			const script = `t('greeting', 'Hello')`;

			const keys = extractScriptKeys(script, options);

			expect(keys).toHaveLength(1);
			expect(keys[0].key).toBe('greeting');
			expect(keys[0].defaultValue).toBe('Hello');
		});

		it('should extract keys from multiple translation calls', () => {
			const options = normalizeOptions({});
			const script = `
<script setup>
const { t } = useTranslation().t
t('key1')
\$t('key2')
</script>`;

			const keys = extractScriptKeys(script, options);

			expect(keys).toHaveLength(2);
			expect(keys.map((k) => k.key)).toEqual(['key1', 'key2']);
		});
	});

	describe('Vue 2 Options API', () => {
		it('should extract keys from data()', () => {
			const options = normalizeOptions({});
			const script = `
export default {
  data() {
    return {
      title: this.\$t('page.title')
    }
  }
}`;

			const keys = extractScriptKeys(script, options);

			expect(keys).toHaveLength(1);
			expect(keys[0].key).toBe('page.title');
		});

		it('should extract keys from methods', () => {
			const options = normalizeOptions({});
			const script = `
export default {
  methods: {
    submit() {
      return this.\$t('button.submit')
    }
  }
}`;

			const keys = extractScriptKeys(script, options);

			expect(keys).toHaveLength(1);
			expect(keys[0].key).toBe('button.submit');
		});
	});

	describe('Namespace Handling', () => {
		it('should extract namespace from useTranslation', () => {
			const options = normalizeOptions({});
			const script = `t('myNamespace:key')`;

			const keys = extractScriptKeys(script, options);

			expect(keys).toHaveLength(1);
			expect(keys[0].key).toBe('key');
			expect(keys[0].namespace).toBe('myNamespace');
		});

		it('should extract namespace from withTranslation', () => {
			const options = normalizeOptions({
				namespaceFunctions: ['withTranslation', 'useTranslation'],
			});
			const script = `t('shared:key')`;

			const keys = extractScriptKeys(script, options);

			expect(keys).toHaveLength(1);
			expect(keys[0].key).toBe('key');
			expect(keys[0].namespace).toBe('shared');
		});

		it('should handle inline namespace in key', () => {
			const options = normalizeOptions({});
			const script = `t('ns:key')`;

			const keys = extractScriptKeys(script, options);

			expect(keys).toHaveLength(1);
			expect(keys[0].key).toBe('key');
			expect(keys[0].namespace).toBe('ns');
		});
	});

	describe('Context and Plurals', () => {
		it('should extract context from options', () => {
			const options = normalizeOptions({});
			const script = `t('user.name', { context: 'male' })`;

			const contexts = extractContextFromExpression(script, options);

			expect(contexts).toEqual(['male']);
		});

		it('should extract multiple contexts', () => {
			const options = normalizeOptions({});
			const script = `
t('user.name', { context: 'male' })
t('user.name', { context: 'female' })`;

			const contexts = extractContextFromExpression(script, options);

			expect(contexts).toEqual(['male', 'female']);
		});
	});

	describe('Template Bindings', () => {
		it('should extract keys from v-bind directive', () => {
			const options = normalizeOptions({});
			const template = `<input v-bind:placeholder="t('input.placeholder')">`;

			const result = extractTemplateKeys(template, options);

			expect(result).toContain("t('input.placeholder')");
		});

		it('should extract keys from shorthand : binding', () => {
			const options = normalizeOptions({});
			const template = `<button :aria-label="t('button.aria')">Click</button>`;

			const result = extractTemplateKeys(template, options);

			expect(result).toContain("t('button.aria')");
		});

		it('should extract keys from v-on directive', () => {
			const options = normalizeOptions({});
			const template = `<button @click="t('button.click')">Click</button>`;

			const result = extractTemplateKeys(template, options);

			expect(result).toContain("t('button.click')");
		});

		it('should respect vueBindAttr option', () => {
			const options = normalizeOptions({ vueBindAttr: false });
			const template = `<button :aria-label="t('button.aria')">Click</button>`;

			const result = extractTemplateKeys(template, options);

			expect(result).toBe('');
		});
	});

	describe('Custom Attributes', () => {
		it('should use custom data-i18n attribute', () => {
			const options = normalizeOptions({ attr: 'i18n-key' });
			const template = `<span i18n-key="custom.key"></span>`;

			const result = extractTemplateKeys(template, options);

			expect(result).toContain("t('custom.key')");
		});

		it('should use custom functions', () => {
			const options = normalizeOptions({ functions: ['translate', '$trans'] });
			const template = `<span :title="translate('my.key')"></span>`;

			const result = extractTemplateKeys(template, options);

			expect(result).toContain("translate('my.key')");
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty script', () => {
			const options = normalizeOptions({});
			const keys = extractScriptKeys('', options);

			expect(keys).toEqual([]);
		});

		it('should handle script without translation calls', () => {
			const options = normalizeOptions({});
			const script = `const x = 1; console.log('hello');`;

			const keys = extractScriptKeys(script, options);

			expect(keys).toEqual([]);
		});

		it('should handle special characters in keys', () => {
			const options = normalizeOptions({});
			const script = `t('key.with.dots.and-dashes')`;

			const keys = extractScriptKeys(script, options);

			expect(keys).toHaveLength(1);
			expect(keys[0].key).toBe('key.with.dots.and-dashes');
		});

		it('should handle template with multiple elements', () => {
			const options = normalizeOptions({});
			const template = `
<div>
  <h1 data-i18n="header.title"></h1>
  <p data-i18n="content.body"></p>
  <button :title="t('button.title')">Submit</button>
</div>`;

			const result = extractTemplateKeys(template, options);

			expect(result).toContain("t('header.title')");
			expect(result).toContain("t('content.body')");
			expect(result).toContain("t('button.title')");
		});
	});
});
