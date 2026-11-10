import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import astro from 'eslint-plugin-astro'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// The promise rules need type information. Each block reads it from the
// TypeScript project that holds the files of its folders, so that no file
// loads the program of another project. A folder ending in `**` also holds
// its subfolders, and the empty folder is the repository root.
const TYPE_PROJECTS = [
  { folders: ['src/**'], project: './tsconfig.app.json' },
  { folders: ['worker/**', 'tools'], project: './tsconfig.worker-tests.json' },
  { folders: [''], project: './tsconfig.node.json' },
  {
    folders: ['desktop', 'desktop/src/**', 'desktop/scripts/**'],
    project: './desktop/tsconfig.json',
  },
  {
    folders: ['desktop/renderer/**', 'desktop/tests/**'],
    project: './desktop/tsconfig.renderer.json',
  },
  { folders: ['runner/**'], project: './runner/tsconfig.json' },
  { folders: ['docs/mockups/src/**'], project: './docs/mockups/tsconfig.json' },
  { folders: ['image'], project: './image/tsconfig.json' },
  {
    folders: ['tools/marketing-pictures'],
    project: './tools/marketing-pictures/tsconfig.json',
  },
]
const TYPESCRIPT_FILES = '*.{ts,tsx}'

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
  ...TYPE_PROJECTS.map(({ folders, project }) => ({
    // The Mac app lint runs this file from `desktop/`. The base path keeps
    // each pattern relative to the repository root there too.
    basePath: import.meta.dirname,
    files: folders.map((folder) =>
      folder ? `${folder}/${TYPESCRIPT_FILES}` : TYPESCRIPT_FILES,
    ),
    // The Astro plugin lints each script of an Astro file as a virtual file
    // with no TypeScript project.
    ignores: ['**/*.astro/**'],
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
