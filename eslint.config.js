import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import astro from 'eslint-plugin-astro'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// The promise rules need type information. Each block reads it from the
// TypeScript project that holds its files, so that no file loads the
// program of another project.
const TYPE_PROJECTS = [
  { files: ['src/**/*.{ts,tsx}'], project: './tsconfig.app.json' },
  {
    files: ['worker/**/*.ts', 'tools/*.ts'],
    project: './tsconfig.worker-tests.json',
  },
  { files: ['*.ts'], project: './tsconfig.node.json' },
  {
    files: ['desktop/*.ts', 'desktop/src/**/*.ts', 'desktop/scripts/**/*.ts'],
    project: './desktop/tsconfig.json',
  },
  {
    files: ['desktop/renderer/**/*.ts', 'desktop/tests/**/*.ts'],
    project: './desktop/tsconfig.renderer.json',
  },
  { files: ['runner/**/*.ts'], project: './runner/tsconfig.json' },
  {
    files: ['docs/mockups/src/**/*.{ts,tsx}'],
    project: './docs/mockups/tsconfig.json',
  },
  { files: ['image/*.ts'], project: './image/tsconfig.json' },
  {
    files: ['tools/marketing-pictures/*.ts'],
    project: './tools/marketing-pictures/tsconfig.json',
  },
]

export default defineConfig([
  globalIgnores([
    '.context',
    'mokly-static',
    '.mokly-export-reservations',
    'dist',
    '.wrangler',
    'coverage',
    '.astro',
    'public/_site',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat['recommended-latest'],
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
  },
  // A promise that the code does not await races the code after it.
  ...TYPE_PROJECTS.map(({ files, project }) => ({
    // The Mac app lint runs this file from `desktop/`. The base path keeps
    // each pattern relative to the repository root there too.
    basePath: import.meta.dirname,
    files,
    languageOptions: {
      parserOptions: { project, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
    },
  })),
  astro.configs.recommended,
  // Each file that the lint checks has at most 300 lines, with comments and
  // blank lines.
  { rules: { 'max-lines': ['error', 300] } },
])
