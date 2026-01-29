# i18next-cli-plugin-vue

i18next-cli 插件，用于从 Vue 单文件组件 (SFC) 中提取 i18n 翻译键。

## 特性

-   **完整 Vue 支持**: 支持 Vue 2.6+ 和 Vue 3.x
-   **双模式解析**: 自动处理 `<script>` 和 `<template>` 中的翻译调用
-   **多种语法**: 支持 `t()` 函数、`data-i18n` 属性、动态绑定等
-   **TypeScript 支持**: 完整的类型定义
-   **高度可配置**: 自定义函数名、属性名、文件模式等

## 安装

```bash
npm install i18next-cli-plugin-vue --save-dev
```

## 使用方法

### 基本配置

```javascript
// i18next.config.js
import { defineConfig } from 'i18next-cli'
import i18nextVuePlugin from 'i18next-cli-plugin-vue'

export default defineConfig({
	locales: ['en', 'zh', 'fr'],
	extract: {
		input: 'src/**/*.{vue,ts}',
		output: 'locales/{{language}}.json',
		defaultNS: 'translation',
	},
	plugins: [i18nextVuePlugin()],
})
```

### 完整配置

```javascript
// i18next.config.js
import { defineConfig } from 'i18next-cli'
import i18nextVuePlugin from 'i18next-cli-plugin-vue'

export default defineConfig({
	locales: ['en', 'zh'],
	extract: {
		input: 'src/**/*.{vue,ts,js}',
		output: 'locales/{{language}}/{{ns}}.json',
		defaultNS: 'common',
	},
	plugins: [
		i18nextVuePlugin({
			// 显式指定 Vue 版本 (2 | 3)
			vueVersion: 3,

			// 是否解析动态绑定属性 (`:attr`, `v-bind:attr`)
			vueBindAttr: true,

			// 翻译函数名列表
			functions: ['t', '$t'],

			// 命名空间函数名列表
			namespaceFunctions: ['useTranslation', 'withTranslation'],

			// HTML 属性名
			attr: 'data-i18n',

			// 选项属性名
			optionAttr: 'data-i18n-options',

			// 匹配的文件模式
			filePatterns: ['.vue', '.nvue'],
		}),
	],
})
```

## 支持的语法

### 模板语法

```vue
<template>
	<!-- data-i18n 属性 -->
	<h1 data-i18n="welcome.title">Welcome</h1>

	<!-- 多个键 (分号分隔) -->
	<p data-i18n="greeting;welcome.message"></p>

	<!-- 动态绑定 :attr -->
	<button :aria-label="t('button.submit')">Submit</button>

	<!-- v-bind:attr -->
	<input v-bind:placeholder="t('input.placeholder')" />

	<!-- v-on:click -->
	<button @click="t('button.click')">Click</button>
</template>
```

### 脚本语法

```vue
<script>
import { useTranslation } from 'vue-i18next'

export default {
	setup() {
		const { t } = useTranslation('namespace')

		return {
			// 简单键
			title: t('welcome.message'),

			// 带默认值
			greeting: t('greeting', 'Hello World'),

			// 带命名空间前缀
			namespaced: t('shared:key'),
		}
	},
}
</script>
```

## API

### 选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `vueVersion` | `2 \| 3 \| undefined` | `undefined` | 显式指定 Vue 版本 |
| `vueBindAttr` | `boolean` | `true` | 是否解析动态绑定 |
| `functions` | `string[]` | `['t', '$t']` | 翻译函数名 |
| `namespaceFunctions` | `string[]` | `['useTranslation', 'withTranslation']` | 命名空间函数 |
| `attr` | `string` | `'data-i18n'` | i18n 属性名 |
| `optionAttr` | `string` | `'data-i18n-options'` | 选项属性名 |
| `filePatterns` | `string[]` | `['.vue', '.nvue']` | 文件匹配模式 |

## 开发

### 安装依赖

```bash
npm install
```

### 构建

```bash
npm run build
```

### 测试

```bash
npm run test        # watch 模式
npm run test:run    # 单次运行
npm run test:coverage # 覆盖率报告
```

### 代码格式化

```bash
npm run format      # 格式化代码
npm run format:check # 检查格式化
```

## 许可证

MIT
