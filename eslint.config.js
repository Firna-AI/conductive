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
  {
    files: [
      'worker/app-api/feature-workspaces-data.ts',
      'worker/app-api/workspace-parent-change-data.ts',
      'worker/app-api/feature-sections-data.ts',
      'worker/automations/automation-write-data.ts',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'CallExpression[callee.type="MemberExpression"][callee.computed=false][callee.property.name=/^(prepare|batch|run)$/]',
          message:
            'Use guardedStatement, guardedBatch, guardedRun, or shellRead from shell-guard.ts.',
        },
        {
          selector:
            'CallExpression[callee.type="MemberExpression"][callee.computed=true][callee.property.value=/^(prepare|batch|run)$/]',
          message:
            'Use guardedStatement, guardedBatch, guardedRun, or shellRead from shell-guard.ts.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/feature-shell-access', '**/shell-guard'],
              importNames: ['activeShellMemberPredicate'],
              message:
                'Use guardedStatement from shell-guard.ts for shell access checks.',
            },
          ],
        },
      ],
    },
  },
])
