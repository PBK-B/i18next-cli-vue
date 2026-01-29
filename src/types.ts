import type { Expression } from 'estree'

export interface VuePluginOptions {
  vueVersion?: 2 | 3
  vueBindAttr?: boolean
  functions?: string[]
  namespaceFunctions?: string[]
  attr?: string
  optionAttr?: string
  filePatterns?: string[]
}

export interface NormalizedVuePluginOptions {
  vueVersion: 2 | 3 | undefined
  vueBindAttr: boolean
  functions: string[]
  namespaceFunctions: string[]
  attr: string
  optionAttr: string
  filePatterns: string[]
}

export interface VueSFCPart {
  type: 'template' | 'script' | 'scriptSetup' | 'style'
  content: string
  lang?: string
  attrs?: Record<string, string>
}

export interface VueSFCDescriptor {
  template: VueSFCPart | null
  script: VueSFCPart | null
  scriptSetup: VueSFCPart | null
  styles: VueSFCPart[]
  customBlocks: VueSFCPart[]
}

export interface VueSFCParser {
  extractScript(): string
  extractTemplate(): string
  extractStyles(): string[]
  extractCustomBlocks(): VueSFCPart[]
  generateVirtualJS(): string
}

export interface ExtractedKeyInfo {
  key: string
  defaultValue?: string
  namespace?: string
  options?: Record<string, unknown>
  context?: string
  plural?: string
}

export interface TemplateToken {
  type: 'text' | 'tag' | 'attr' | 'directive' | 'binding' | 'interpolation'
  value: string
  attrName?: string
  attrValue?: string
  loc?: {
    start: { line: number; column: number }
    end: { line: number; column: number }
  }
}

export interface FunctionCallMatch {
  functionName: string
  key: string
  defaultValue?: string
  options?: Record<string, unknown>
  start: number
  end: number
}

export interface NamespaceInfo {
  functionName: string
  namespace: string | undefined
  keyPrefix?: string
}

export type ExtractKeysFunction = (
  expression: Expression,
  options: NormalizedVuePluginOptions
) => string[]

export type ExtractContextFunction = (
  expression: Expression,
  options: NormalizedVuePluginOptions
) => string[]
