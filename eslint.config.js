import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import astro from 'eslint-plugin-astro'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// The app, the Worker, and the Mac app own the shared UI in src/ui/. The
// mockup catalogue imports it, never the other way round. Development code
// and tests may still import the mockup fixtures.
const mockupImports = {
  group: ['**/docs/mockups/**'],
  message:
    'Shipped code imports nothing from docs/mockups/. Move the module into src/ui/, as src/ui/README.md says.',
}

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
    files: ['src/**/*.{ts,tsx}', 'worker/**/*.ts', 'desktop/**/*.{ts,tsx}'],
    ignores: [
      '**/dev/**',
      '**/test-support/**',
      '**/*.test-support.ts',
      '**/*.{test,spec}.{ts,tsx}',
      'desktop/tests/**',
    ],
    rules: {
      'no-restricted-imports': ['error', { patterns: [mockupImports] }],
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
            // A later rule entry replaces an earlier one, so repeat it.
            mockupImports,
          ],
        },
      ],
    },
  },
])
