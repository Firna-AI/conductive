import { expect, it } from 'vitest'
import type { Token } from '../code/highlight'
import { languageOf } from '../code/languages'
import { highlightDiff } from './highlight-diff'
import { parsePatch } from './parse-patch'

const script = languageOf('form.ts')

function kinds(tokens: Token[] | null): string | null {
  if (!tokens) return null
  return tokens.map((token) => `${token.kind}:${token.text}`).join('|')
}

it('colours a hunk inside a comment that opens above it from the whole files', () => {
  const oldContent = '/*\n a\n b\n*/\nconst x = 1\n'
  const newContent = '/*\n a\n c\n*/\nconst x = 1\n'
  const rows = parsePatch(['@@ -3,2 +3,2 @@', '- b', '+ c', ' */'].join('\n'))
  const tokens = highlightDiff(rows, script, oldContent, newContent)
  expect(tokens?.map(kinds)).toEqual([
    null,
    'comment: b',
    'comment: c',
    'comment:*/',
  ])
})

it('reads the diff text when the files are absent or do not match', () => {
  const rows = parsePatch(
    [
      '@@ -1,2 +1,2 @@',
      '-const a = `one',
      '+let a = 2',
      ' two`',
      '@@ -9,1 +9,1 @@',
      '-return x',
      '\\ No newline at end of file',
    ].join('\n'),
  )
  const tokens = highlightDiff(rows, script, null, 'other\n')
  expect(tokens?.map(kinds)).toEqual([
    null,
    'keyword:const|plain: a = |string:`one',
    'keyword:let|plain: a = |number:2',
    // The new side reads context rows, so the removed string does not
    // carry on.
    'plain:two|string:`',
    null,
    'keyword:return|plain: x',
    null,
  ])
})

it('gives no tokens without a language', () => {
  const rows = parsePatch('@@ -1,1 +1,1 @@\n-a\n+b\n')
  expect(highlightDiff(rows, languageOf('notes'), 'a\n', 'b\n')).toBeNull()
})
