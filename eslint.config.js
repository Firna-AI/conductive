import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import astro from 'eslint-plugin-astro'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

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
  astro.configs.recommended,
  {
    // Keep each JavaScript, TypeScript, and Astro file short. Blank lines
    // and comments count.
    rules: {
      'max-lines': ['error', 300],
    },
  },
])
