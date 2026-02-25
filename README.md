# i18next-cli-vue

[![npm version](https://img.shields.io/npm/v/i18next-cli-vue.svg)](https://www.npmjs.com/package/i18next-cli-vue) [![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE) [![Vue 2.6+](https://img.shields.io/badge/Vue-2.6+-41b883.svg)](https://vuejs.org/) [![Vue 3.x](https://img.shields.io/badge/Vue-3.x-41b883.svg)](https://vuejs.org/) [![pkg.pr.new](https://pkg.pr.new/badge/PBK-B/i18next-cli-vue)](https://pkg.pr.new/~/PBK-B/i18next-cli-vue)

[English](README.md) | [中文](README.zh-CN.md)

i18next-cli plugin for extracting i18n translation keys from Vue Single File Components (SFC).

## Features

- **Full Vue Support**: Supports Vue 2.6+ and Vue 3.x
- **Dual-mode Parsing**: Automatically handles translation calls in `<script>` and `<template>`
- **Multiple Syntaxes**: Supports `t()` function, `data-i18n` attribute, dynamic bindings, and more
- **TypeScript Support**: Complete type definitions
- **Highly Configurable**: Custom function names, attribute names, file patterns, and more

## Installation

```bash
npm install i18next-cli-vue --save-dev
```

## Usage

### Basic Configuration

```javascript
// i18next.config.js
import { defineConfig } from 'i18next-cli';
import i18nextVuePlugin from 'i18next-cli-vue';

export default defineConfig({
	locales: ['en', 'zh', 'fr'],
	extract: {
		input: 'src/**/*.{vue,ts}',
		output: 'locales/{{language}}.json',
		defaultNS: 'translation',
	},
	plugins: [i18nextVuePlugin()],
});
```

### Full Configuration

```javascript
// i18next.config.js
import { defineConfig } from 'i18next-cli';
import i18nextVuePlugin from 'i18next-cli-vue';

export default defineConfig({
	locales: ['en', 'zh'],
	extract: {
		input: 'src/**/*.{vue,ts,js}',
		output: 'locales/{{language}}/{{ns}}.json',
		defaultNS: 'common',
	},
	plugins: [
		i18nextVuePlugin({
			// Explicitly specify Vue version (2 | 3)
			vueVersion: 3,

			// Whether to parse dynamic binding attributes (`:attr`, `v-bind:attr`)
			vueBindAttr: true,

			// Translation function names
			functions: ['t', '$t'],

			// Namespace function names
			namespaceFunctions: ['useTranslation', 'withTranslation'],

			// HTML attribute name
			attr: 'data-i18n',

			// Options attribute name
			optionAttr: 'data-i18n-options',

			// File patterns to match
			filePatterns: ['.vue', '.nvue'],
		}),
	],
});
```

## Supported Syntax

### Template Syntax

```vue
<template>
	<!-- data-i18n attribute -->
	<h1 data-i18n="welcome.title">Welcome</h1>

	<!-- Multiple keys (semicolon separated) -->
	<p data-i18n="greeting;welcome.message"></p>

	<!-- Dynamic binding :attr -->
	<button :aria-label="t('button.submit')">Submit</button>

	<!-- v-bind:attr -->
	<input v-bind:placeholder="t('input.placeholder')" />

	<!-- v-on:click -->
	<button @click="t('button.click')">Click</button>
</template>
```

### Script Syntax

```vue
<script>
import { useTranslation } from 'vue-i18next';

export default {
	setup() {
		const { t } = useTranslation('namespace');

		return {
			// Simple key
			title: t('welcome.message'),

			// With default value
			greeting: t('greeting', 'Hello World'),

			// With namespace prefix
			namespaced: t('shared:key'),
		};
	},
};
</script>
```

## Lint Usage

Since `i18next-cli@1.44.0`, lint supports plugin hooks. `i18next-cli-vue` now provides `lintOnLoad` and `lintOnResult` so `.vue` files can be linted directly.

```javascript
// i18next.config.js
import { defineConfig } from 'i18next-cli';
import i18nextVuePlugin from 'i18next-cli-vue';

export default defineConfig({
	locales: ['en', 'zh'],
	extract: {
		input: 'src/**/*.{vue,ts,js}',
		output: 'locales/{{language}}/{{ns}}.json',
	},
	plugins: [i18nextVuePlugin()],
});
```

If you only want to lint JavaScript/TypeScript files, you can still ignore Vue SFCs:

```javascript
lint: {
	// Only lint JS/TS files
	input: ['src/**/*.{js,ts,jsx,tsx}'],
	ignore: ['**/*.vue'],
},
```

## API

### Options

| Option               | Type                              | Default Value                           | Description                |
| -------------------- | --------------------------------- | --------------------------------------- | -------------------------- |
| `vueVersion`         | `2` &#124; `3` &#124; `undefined` | `undefined`                             | Explicit Vue version       |
| `vueBindAttr`        | `boolean`                         | `true`                                  | Parse dynamic bindings     |
| `functions`          | `string[]`                        | `['t', '$t']`                           | Translation function names |
| `namespaceFunctions` | `string[]`                        | `['useTranslation', 'withTranslation']` | Namespace functions        |
| `attr`               | `string`                          | `'data-i18n'`                           | i18n attribute name        |
| `optionAttr`         | `string`                          | `'data-i18n-options'`                   | Options attribute name     |
| `filePatterns`       | `string[]`                        | `['.vue', '.nvue']`                     | File matching patterns     |

## Development

### Install Dependencies

```bash
npm install
```

### Build

```bash
npm run build
```

### Test

```bash
npm run test        # watch mode
npm run test:run    # single run
npm run test:coverage # coverage report
```

### Code Formatting

```bash
npm run format      # format code
npm run format:check # check formatting
```

## License

[MIT License](LICENSE)
