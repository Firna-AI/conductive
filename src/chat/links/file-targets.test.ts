import { describe, expect, it } from 'vitest'
import type { FileEntry } from '../../shared/files'
import { mentionAt } from '../../shared/mention-text'
import { codeTarget, mentionTarget, type EntryLookup } from './file-targets'

const entries: FileEntry[] = [
  { path: 'src/app.ts', name: 'app.ts', kind: 'file', change: null },
  { path: 'src/lib', name: 'lib', kind: 'directory', change: null },
  { path: 'runner', name: 'runner', kind: 'directory', change: null },
  { path: 'README.md', name: 'README.md', kind: 'file', change: null },
  { path: 'Makefile', name: 'Makefile', kind: 'file', change: null },
  { path: '.context/a.png', name: 'a.png', kind: 'file', change: null },
  {
    path: 'docs/My notes.md',
    name: 'My notes.md',
    kind: 'file',
    change: null,
  },
]

const find: EntryLookup = (path, folder) =>
  entries.find(
    (entry) => entry.path === path && (entry.kind === 'directory') === folder,
  )

const root = '/home/user/code/checkout'

/** The path and the lines of the target of `code`, or null. */
function code(text: string) {
  const target = codeTarget(text, find, root)
  return target && { path: target.entry.path, lines: target.lines }
}

describe('codeTarget', () => {
  it.each([
    ['src/app.ts', 'src/app.ts', null],
    ['./src/app.ts', 'src/app.ts', null],
    [`${root}/src/app.ts`, 'src/app.ts', null],
    [`${root}/.context/a.png`, '.context/a.png', null],
    ['src/lib/', 'src/lib', null],
    ['src/lib', 'src/lib', null],
    ['runner/', 'runner', null],
    ['README.md', 'README.md', null],
    ['docs/My notes.md', 'docs/My notes.md', null],
    ['src/app.ts:42', 'src/app.ts', { start: 42, end: 42 }],
    ['src/app.ts:42-50', 'src/app.ts', { start: 42, end: 50 }],
    [`${root}/src/app.ts#L7`, 'src/app.ts', { start: 7, end: 7 }],
    ['Makefile:3', 'Makefile', { start: 3, end: 3 }],
    ['.context/a.png:3', '.context/a.png', null],
  ])('reads %s', (text, path, lines) => {
    expect(code(text)).toEqual({ path, lines })
  })

  it.each([
    ['one word', 'runner'],
    ['one word that names a file', 'Makefile'],
    ['a path that names nothing', 'src/gone.ts'],
    ['a path in another repository', '/home/user/code/other/src/app.ts'],
    ['a path outside the folder', '/etc/passwd'],
    ['a folder with lines', 'src/lib:4'],
    ['a command', 'npm run build'],
    ['a space before the path', ' src/app.ts'],
    ['a line break', 'src/app.ts\n'],
    ['a parent path', '../src/app.ts'],
  ])('keeps %s as code', (_, text) => {
    expect(code(text)).toBe(null)
  })

  it('reads no absolute path without the folder', () => {
    expect(codeTarget(`${root}/src/app.ts`, find, null)).toBe(null)
  })

  it('reads no absolute path of a folder that only starts the same', () => {
    expect(code(`${root}-old/src/app.ts`)).toBe(null)
  })
})

/** The source, the path, the lines, and the rest of a mention in `text`. */
function mention(text: string) {
  const found = mentionAt(text, 0)
  const match = found && mentionTarget(found, find)
  return (
    match && {
      source: match.source,
      path: match.target.entry.path,
      lines: match.target.lines,
      rest: match.rest,
    }
  )
}

describe('mentionTarget', () => {
  it.each([
    ['@src/app.ts', '@src/app.ts', 'src/app.ts', null, ''],
    ['@src/lib/', '@src/lib/', 'src/lib', null, ''],
    ['@src/app.ts.', '@src/app.ts', 'src/app.ts', null, '.'],
    ['@src/app.ts)', '@src/app.ts', 'src/app.ts', null, ')'],
    ['@src/lib/,', '@src/lib/', 'src/lib', null, ','],
    [
      '@src/app.ts:42',
      '@src/app.ts:42',
      'src/app.ts',
      { start: 42, end: 42 },
      '',
    ],
    [
      '@src/app.ts:4-9.',
      '@src/app.ts:4-9',
      'src/app.ts',
      { start: 4, end: 9 },
      '.',
    ],
    [
      '@"docs/My notes.md"',
      '@"docs/My notes.md"',
      'docs/My notes.md',
      null,
      '',
    ],
  ])('reads %s', (text, source, path, lines, rest) => {
    expect(mention(text)).toEqual({ source, path, lines, rest })
  })

  it.each([
    '@src/gone.ts',
    '@src/app.ts..',
    '@src/lib',
    '@src/lib/:4',
    '@runner',
  ])('reads no entry from %s', (text) => {
    expect(mention(text)).toBe(null)
  })
})
