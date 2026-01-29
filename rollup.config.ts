import typescript from '@rollup/plugin-typescript'
import { defineConfig } from 'rollup'

export default defineConfig({
  input: 'src/index.ts',
  output: {
    file: 'dist/index.js',
    format: 'esm',
    sourcemap: true,
  },
  external: [
    'i18next-cli',
    'vue',
    '@vue/compiler-sfc',
    'vue-template-compiler',
  ],
  plugins: [
    typescript({
      compilerOptions: {
        declaration: true,
        declarationDir: 'dist',
        emitDeclarationOnly: true,
      },
    }),
  ],
})
