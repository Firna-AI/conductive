import { expect, test } from 'vitest'
import { routes } from '../../app/router'
import type { FileEntry } from '../../shared/generated/FileEntry'
import type { Workspace } from '../../shared/generated/Workspace'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { partsOf, readingOf, shapes } from './answer-test-kit'

const linked = workspaceFixtures().workspaces.workspaces[0] as Workspace
const links = { orgId: FAKE_IDS.org, workspaces: [linked] }
const entries: FileEntry[] = [
  { path: 'src/app.ts', name: 'app.ts', kind: 'file', change: null },
]

/**
 * The parts that the chat draws for the first block of an answer, in their
 * short form: the words of a link show each line break as `\n`.
 */
function drawn(text: string): unknown[] {
  return shapes(partsOf(text, readingOf(links, entries)))
}

const chip = { chip: linked.id, to: routes.workspace(FAKE_IDS.org, linked.id) }

test('a link label and the alt text of an image are text of their block, so only the edges of the block and a long run drop their line breaks, as the link shows', () => {
  const cases = [
    // The input of finding 23 of review round 1.
    [
      'Before[<br>label<br>](https://example.com)after',
      [{ text: 'Before' }, { web: '\nlabel\n' }, { text: 'after' }],
    ],
    [
      'See ![<br>alt<br>](https://example.com/x.png) here',
      [{ text: 'See ' }, { web: '\nalt\n' }, { text: ' here' }],
    ],
    ['[<br>label<br>](https://example.com)', [{ web: 'label' }]],
    [
      'a [b<br><br><br><br>c](https://example.com) d',
      [{ text: 'a ' }, { web: 'b\n\nc' }, { text: ' d' }],
    ],
    [
      'a [b\\\n](https://example.com) c',
      [{ text: 'a ' }, { web: 'b\n' }, { text: ' c' }],
    ],
    [
      'a [**<br>b**](https://example.com) c',
      [{ text: 'a ' }, { web: '\nb' }, { text: ' c' }],
    ],
    // A link that opens nothing shows as typed, so its brackets show.
    [
      'x [<br>label<br>](nowhere) y',
      [
        { text: 'x [' },
        { break: true },
        { text: 'label' },
        { break: true },
        { text: '](nowhere) y' },
      ],
    ],
    [
      '[<br>label<br>](nowhere)',
      [
        { text: '[' },
        { break: true },
        { text: 'label' },
        { break: true },
        { text: '](nowhere)' },
      ],
    ],
    // A label of only a line break shows the address in its place.
    [
      'a<br>[<br>](https://example.com)<br><br>c',
      [
        { text: 'a' },
        { break: true },
        { web: 'https://example.com' },
        { break: true },
        { break: true },
        { text: 'c' },
      ],
    ],
    [
      'a<br><br>[<br>](https://example.com)<br>c',
      [
        { text: 'a' },
        { break: true },
        { break: true },
        { web: 'https://example.com' },
        { break: true },
        { text: 'c' },
      ],
    ],
    // A workspace link shows as its chip, without its label.
    [
      `a<br>[x<br>](${linked.link})<br><br>c`,
      [
        { text: 'a' },
        { break: true },
        chip,
        { break: true },
        { break: true },
        { text: 'c' },
      ],
    ],
    [
      'See [<br>the form<br>](src/app.ts) here',
      [
        { text: 'See ' },
        { link: 'src/app.ts', label: '\nthe form\n' },
        { text: ' here' },
      ],
    ],
    [
      '[<br>the form<br>](src/app.ts)',
      [{ link: 'src/app.ts', label: 'the form' }],
    ],
  ] as const
  // One comparison of the whole table names each case that differs.
  const actual = cases.map(([text]) => [text, drawn(text)])
  expect(actual).toEqual(cases)
})

test('a block draws no line break at its start or its end, and at most one empty line for a run of breaks, also in a table cell', () => {
  expect({
    ends: drawn('<br><br>Start and end<br> <br>'),
    run: drawn('One<br><br><br> <br>two<br>**<br><br>three**'),
    cell: drawn('| <br>x<br> |\n| --- |'),
  }).toEqual({
    ends: [{ text: 'Start and end' }],
    run: [
      { text: 'One' },
      { break: true },
      { break: true },
      { text: 'two' },
      { break: true },
      { strong: [{ break: true }, { text: 'three' }] },
    ],
    cell: [{ text: 'x' }],
  })
})
