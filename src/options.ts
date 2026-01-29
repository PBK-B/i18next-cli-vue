import type {
  VuePluginOptions,
  NormalizedVuePluginOptions,
} from './types'

export const DEFAULT_OPTIONS: NormalizedVuePluginOptions = {
  vueVersion: undefined,
  vueBindAttr: true,
  functions: ['t', '$t'],
  namespaceFunctions: ['useTranslation', 'withTranslation'],
  attr: 'data-i18n',
  optionAttr: 'data-i18n-options',
  filePatterns: ['.vue', '.nvue'],
}

export function normalizeOptions(
  options: VuePluginOptions = {}
): NormalizedVuePluginOptions {
  return {
    vueVersion: options.vueVersion ?? DEFAULT_OPTIONS.vueVersion,
    vueBindAttr: options.vueBindAttr ?? DEFAULT_OPTIONS.vueBindAttr,
    functions: options.functions ?? DEFAULT_OPTIONS.functions,
    namespaceFunctions:
      options.namespaceFunctions ?? DEFAULT_OPTIONS.namespaceFunctions,
    attr: options.attr ?? DEFAULT_OPTIONS.attr,
    optionAttr: options.optionAttr ?? DEFAULT_OPTIONS.optionAttr,
    filePatterns: options.filePatterns ?? DEFAULT_OPTIONS.filePatterns,
  }
}

export function validateOptions(
  options: NormalizedVuePluginOptions
): void {
  if (
    options.vueVersion !== undefined &&
    options.vueVersion !== 2 &&
    options.vueVersion !== 3
  ) {
    throw new Error(
      `Invalid vueVersion: ${options.vueVersion}. Expected 2 or 3.`
    )
  }

  if (!Array.isArray(options.functions) || options.functions.length === 0) {
    throw new Error('functions must be a non-empty array')
  }

  if (
    !Array.isArray(options.namespaceFunctions) ||
    options.namespaceFunctions.length === 0
  ) {
    throw new Error('namespaceFunctions must be a non-empty array')
  }

  if (typeof options.attr !== 'string' || options.attr.length === 0) {
    throw new Error('attr must be a non-empty string')
  }

  if (typeof options.optionAttr !== 'string' || options.optionAttr.length === 0) {
    throw new Error('optionAttr must be a non-empty string')
  }

  if (
    !Array.isArray(options.filePatterns) ||
    options.filePatterns.length === 0
  ) {
    throw new Error('filePatterns must be a non-empty array')
  }
}
