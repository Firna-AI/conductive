import { describe, expect, test } from 'vitest'
import type { FileEntry } from '../../shared/files'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { chatParts, type ChatPart, type EntryLookup } from './chat-parts'

const links = { orgId: FAKE_IDS.org, workspaces: [] }

const entries: FileEntry[] = [
  { path: 'src/app.ts', name: 'app.ts', kind: 'file', change: null },
  { path: 'shots/after.png', name: 'after.png', kind: 'file', change: null },
]

const find: EntryLookup = (path, folder) =>
  entries.find(
    (entry) => entry.path === path && (entry.kind === 'directory') === folder,
  )

const root = '/home/user/code/checkout'

function shapes(parts: readonly ChatPart[]) {
  return parts.map((part) =>
    part.kind === 'file'
      ? {
          file: part.entry.path,
          source: part.source,
          ...(part.lines ? { lines: part.lines } : {}),
          ...(part.strong ? { strong: true } : {}),
        }
      : part.kind === 'text'
        ? { text: part.text, ...(part.strong ? { strong: true } : {}) }
        : part.kind === 'code'
          ? { code: part.text }
          : { [part.kind]: part.source },
  )
}

/** The parts of an answer, as the chat reads it with a tree. */
function answer(text: string) {
  return shapes(
    chatParts(text, links, {
      strong: true,
      mentions: find,
      code: { root },
    }),
  )
}

describe('file chips in an answer', () => {
  test('a path in inline code and a mention are file chips', () => {
    expect(
      answer(
        `File: \`${root}/shots/after.png\`, see @src/app.ts:4 and \`src/app.ts:7-9\`.`,
      ),
    ).toEqual([
      { text: 'File: ' },
      { file: 'shots/after.png', source: `${root}/shots/after.png` },
      { text: ', see ' },
      {
        file: 'src/app.ts',
        source: '@src/app.ts:4',
        lines: { start: 4, end: 4 },
      },
      { text: ' and ' },
      {
        file: 'src/app.ts',
        source: 'src/app.ts:7-9',
        lines: { start: 7, end: 9 },
      },
      { text: '.' },
    ])
  })

  test('a mention at the end of a sentence keeps the mark as text', () => {
    expect(answer('Read @src/app.ts.')).toEqual([
      { text: 'Read ' },
      { file: 'src/app.ts', source: '@src/app.ts' },
      { text: '.' },
    ])
  })

  test('bold around a mention stays bold, and code ends bold', () => {
    expect(answer('**Read @src/app.ts** and **`src/app.ts`**')).toEqual([
      { text: 'Read ', strong: true },
      { file: 'src/app.ts', source: '@src/app.ts', strong: true },
      { text: ' and ' },
      { file: 'src/app.ts', source: 'src/app.ts' },
    ])
  })

  test('other code, a path that names nothing, and a label stay as they are', () => {
    expect(
      answer(
        '`npm test`, `src/gone.ts`, @src/gone.ts, [`src/app.ts`](https://a.test)',
      ),
    ).toEqual([
      { code: 'npm test' },
      { text: ', ' },
      { code: 'src/gone.ts' },
      { text: ', @src/gone.ts, [' },
      { code: 'src/app.ts' },
      { text: '](https://a.test)' },
    ])
  })

  test('without a tree, the paths stay code and the mentions stay text', () => {
    expect(
      shapes(
        chatParts('`src/app.ts` @src/app.ts', links, {
          strong: true,
          code: { root },
        }),
      ),
    ).toEqual([{ code: 'src/app.ts' }, { text: ' @src/app.ts' }])
  })

  test('a message of a member keeps its code as code', () => {
    expect(
      shapes(
        chatParts('`src/app.ts` and @src/app.ts', links, {
          strong: false,
          mentions: find,
        }),
      ),
    ).toEqual([
      { code: 'src/app.ts' },
      { text: ' and ' },
      { file: 'src/app.ts', source: '@src/app.ts' },
    ])
  })
})
