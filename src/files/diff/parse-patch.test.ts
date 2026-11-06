import { expect, it } from 'vitest'
import { parsePatch } from './parse-patch'

it('numbers the old and the new lines from each hunk header', () => {
  const patch = [
    'diff --git a/form.tsx b/form.tsx',
    '--- a/form.tsx',
    '+++ b/form.tsx',
    '@@ -1,2 +1,2 @@',
    ' keep',
    '-old',
    '+new',
    '\\ No newline at end of file',
    '@@ -18,1 +18,2 @@ export function Form()',
    ' same',
    '+added',
    '',
  ].join('\n')
  expect(parsePatch(patch)).toEqual([
    { kind: 'hunk', text: '@@ -1,2 +1,2 @@' },
    { kind: 'context', text: 'keep', oldLine: 1, newLine: 1 },
    { kind: 'removed', text: 'old', oldLine: 2, newLine: null },
    { kind: 'added', text: 'new', oldLine: null, newLine: 2 },
    { kind: 'note', text: '\\ No newline at end of file' },
    { kind: 'hunk', text: '@@ -18,1 +18,2 @@ export function Form()' },
    { kind: 'context', text: 'same', oldLine: 18, newLine: 18 },
    { kind: 'added', text: 'added', oldLine: null, newLine: 19 },
  ])
})
