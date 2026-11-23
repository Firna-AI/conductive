import { describe, expect, test } from 'vitest'
import type { FileEntry } from '../../shared/generated/FileEntry'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { partsOf, readingOf, shapes } from './answer-test-kit'

const links = { orgId: FAKE_IDS.org, workspaces: [] }

const entries: FileEntry[] = [
  { path: 'src/app.ts', name: 'app.ts', kind: 'file', change: null },
  { path: 'shots/after.png', name: 'after.png', kind: 'file', change: null },
  { path: 'src/my app.ts', name: 'my app.ts', kind: 'file', change: null },
  { path: 'src/my_file.ts', name: 'my_file.ts', kind: 'file', change: null },
  { path: 'docs/flow.svg', name: 'flow.svg', kind: 'file', change: null },
  { path: 'shots.png', name: 'shots.png', kind: 'directory', change: null },
]

const root = '/home/user/code/checkout'

/** The parts of an answer, as the chat reads it with a tree. */
function answer(text: string) {
  return shapes(partsOf(text, readingOf(links, entries, root)))
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

  test('bold around a mention or a path in code stays bold', () => {
    expect(answer('**Read @src/app.ts** and **`src/app.ts`**')).toEqual([
      {
        strong: [
          { text: 'Read ' },
          { file: 'src/app.ts', source: '@src/app.ts' },
        ],
      },
      { text: ' and ' },
      { strong: [{ file: 'src/app.ts', source: 'src/app.ts' }] },
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
      { text: ', @src/gone.ts, ' },
      { web: 'src/app.ts' },
    ])
  })

  test('without a tree, the paths stay code and the mentions stay text', () => {
    expect({
      paths: shapes(partsOf('`src/app.ts` @src/app.ts', readingOf(links))),
      inCode: shapes(
        partsOf('Read `@src/app.ts` and @src/app.ts', readingOf(links)),
      ),
    }).toEqual({
      paths: [{ code: 'src/app.ts' }, { text: ' @src/app.ts' }],
      inCode: [
        { text: 'Read ' },
        { code: '@src/app.ts' },
        { text: ' and @src/app.ts' },
      ],
    })
  })

  test('a Markdown link or image to a file of the tree is a link with its label', () => {
    expect(
      answer(
        `See ![Phone view](${root}/shots/after.png) and [the \`form\`](src/app/../app.ts) or [line 4](./src/app.ts#L4-L6).`,
      ),
    ).toEqual([
      { text: 'See ' },
      { link: 'shots/after.png', label: 'Phone view' },
      { text: ' and [the ' },
      { code: 'form' },
      { text: '](src/app/../app.ts) or ' },
      { link: 'src/app.ts', label: 'line 4', lines: { start: 4, end: 6 } },
      { text: '.' },
    ])
  })

  test('an image with no label shows the name of the file, a web image shows its alt text as a link, and other targets stay text', () => {
    expect(
      answer(
        `![](shots/after.png) ![x](https://a.test/x.png) [gone](src/gone.ts) [s](src/gone%20file.ts)`,
      ),
    ).toEqual([
      { link: 'shots/after.png', label: 'after.png' },
      { text: ' ' },
      { web: 'x' },
      { text: ' [gone](src/gone.ts) [s](src/gone%20file.ts)' },
    ])
  })

  test('only the image of a picture file can show as its picture', () => {
    const parts = partsOf(
      '![a](shots/after.png) [b](shots/after.png) ![c](docs/flow.svg) ![d](shots.png/) ![e](src/app.ts)',
      readingOf(links, entries, root),
    )
    expect(
      parts.flatMap((part) =>
        part.kind === 'file-link'
          ? [{ path: part.entry.path, picture: part.picture !== null }]
          : [],
      ),
    ).toEqual([
      { path: 'shots/after.png', picture: true },
      { path: 'shots/after.png', picture: false },
      { path: 'docs/flow.svg', picture: false },
      { path: 'shots.png', picture: false },
      { path: 'src/app.ts', picture: false },
    ])
  })

  test('a link target with a space opens its file, escaped or in angle brackets', () => {
    expect(
      answer('[a](src/my%20app.ts) [b](<src/my app.ts>) [c](src/my app.ts)'),
    ).toEqual([
      { link: 'src/my app.ts', label: 'a' },
      { text: ' ' },
      { link: 'src/my app.ts', label: 'b' },
      { text: ' [c](src/my app.ts)' },
    ])
  })

  test('a mention can start right after a bold mark, and stays bold', () => {
    expect(
      answer('- **@src/app.ts**: added the hook, mail a@src/app.ts'),
    ).toEqual([
      { strong: [{ file: 'src/app.ts', source: '@src/app.ts' }] },
      { text: ': added the hook, mail a@src/app.ts' },
    ])
  })

  test('a mention can start right after each mark, and it ends before the mark that closes it', () => {
    expect({
      marks: answer(
        '*@src/app.ts* _@src/my_file.ts_ ~~@src/app.ts~~ **bold**@src/app.ts',
      ),
      opens: answer('Read *@src/app.ts and 3 * 4.'),
      closes: answer('See @src/app.ts* and @src/app.ts~~.'),
      inWord: answer('mail a@src/app.ts or `x`@src/app.ts'),
    }).toEqual({
      marks: [
        { emphasis: [{ file: 'src/app.ts', source: '@src/app.ts' }] },
        { text: ' ' },
        { emphasis: [{ file: 'src/my_file.ts', source: '@src/my_file.ts' }] },
        { text: ' ' },
        { strike: [{ file: 'src/app.ts', source: '@src/app.ts' }] },
        { text: ' ' },
        { strong: [{ text: 'bold' }] },
        { file: 'src/app.ts', source: '@src/app.ts' },
      ],
      opens: [
        { text: 'Read *' },
        { file: 'src/app.ts', source: '@src/app.ts' },
        { text: ' and 3 * 4.' },
      ],
      closes: [
        { text: 'See ' },
        { file: 'src/app.ts', source: '@src/app.ts' },
        { text: '* and ' },
        { file: 'src/app.ts', source: '@src/app.ts' },
        { text: '~~.' },
      ],
      inWord: [
        { text: 'mail a@src/app.ts or ' },
        { code: 'x' },
        { text: '@src/app.ts' },
      ],
    })
  })
})
