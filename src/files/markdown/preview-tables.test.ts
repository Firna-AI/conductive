import { expect, test } from 'vitest'
import { previewDocument } from './preview-blocks'

const full =
  'a|'.repeat(1024) + '\n' + '-|'.repeat(1024) + '\n' + '|\n'.repeat(64)

test('keeps a reference definition at the cutoff and the remaining file as literal text', () => {
  const tail = '[ref]: <a|b>\n\n# After'
  const { blocks } = previewDocument(full + tail)
  expect(blocks.at(-1)).toEqual({ kind: 'literal', text: tail })
  expect(blocks.map((block) => block.kind)).toEqual(['table', 'literal'])
})

test('keeps a reference in the literal table tail from linking earlier text', () => {
  const tail = 'x|y\n\n[ref]: https://example.com/doc\n\n# After'
  const { blocks } = previewDocument('See [the doc][ref].\n\n' + full + tail)
  expect(blocks[0]).toEqual({
    kind: 'paragraph',
    text: [{ kind: 'text', text: 'See [the doc][ref].' }],
  })
  expect(blocks.at(-1)).toEqual({ kind: 'literal', text: tail })
})

test('pads repeated sparse tables only within the file budget', () => {
  for (const [columns, rows, count, cells] of [
    [200, 200, 40, 65_400],
    [1024, 64, 48, 65_536],
  ]) {
    const sparse =
      'a|'.repeat(columns) +
      '\n' +
      '-|'.repeat(columns) +
      '\n' +
      '|\n'.repeat(rows)
    const { blocks } = previewDocument(Array(count).fill(sparse).join('\n'))
    const tables = blocks.filter((block) => block.kind === 'table')
    expect(tables).toHaveLength(2)
    expect(
      tables.reduce(
        (sum, table) =>
          sum + table.rows.reduce((total, row) => total + row.length, 0),
        0,
      ),
    ).toBe(cells)
    expect(blocks.at(-1)?.kind).toBe('literal')
  }
})

test('takes no empty-cell budget for a table inside a flattened deep quote', () => {
  const deep = full
    .trimEnd()
    .split('\n')
    .map((line) => '> '.repeat(17) + line)
    .join('\n')
  const { blocks } = previewDocument(deep + '\n\nh|i\n-|-\n|\n\n# After')
  expect(blocks.map((block) => block.kind)).toEqual([
    'quote',
    'table',
    'heading',
  ])
  expect(blocks[1]).toEqual({
    kind: 'table',
    head: [[{ kind: 'text', text: 'h' }], [{ kind: 'text', text: 'i' }]],
    align: [null, null],
    rows: [[[], []]],
  })
})

test('keeps a line without a pipe as one more preview row and pads its missing cell', () => {
  expect(previewDocument('a | b\n--- | ---\nc | d\nno pipe').blocks).toEqual([
    {
      kind: 'table',
      head: [[{ kind: 'text', text: 'a' }], [{ kind: 'text', text: 'b' }]],
      align: [null, null],
      rows: [
        [[{ kind: 'text', text: 'c' }], [{ kind: 'text', text: 'd' }]],
        [[{ kind: 'text', text: 'no pipe' }], []],
      ],
    },
  ])
})

test.each([
  [
    '- a | b',
    [
      {
        kind: 'list',
        ordered: false,
        start: 1,
        items: [
          {
            checked: null,
            blocks: [
              {
                kind: 'paragraph',
                text: [{ kind: 'text', text: 'a | b\n--- | ---' }],
              },
            ],
          },
        ],
      },
    ],
  ],
  [
    '1. a | b',
    [
      {
        kind: 'list',
        ordered: true,
        start: 1,
        items: [
          {
            checked: null,
            blocks: [
              {
                kind: 'paragraph',
                text: [{ kind: 'text', text: 'a | b\n--- | ---' }],
              },
            ],
          },
        ],
      },
    ],
  ],
  [
    '> a | b',
    [
      {
        kind: 'quote',
        blocks: [
          {
            kind: 'paragraph',
            text: [{ kind: 'text', text: 'a | b\n--- | ---' }],
          },
        ],
      },
    ],
  ],
  [
    '# a | b',
    [
      { kind: 'heading', level: 1, text: [{ kind: 'text', text: 'a | b' }] },
      { kind: 'paragraph', text: [{ kind: 'text', text: '--- | ---' }] },
    ],
  ],
])(
  'keeps the block mark of %s out of a preview table header',
  (header, blocks) => {
    expect(previewDocument(`${header}\n--- | ---`).blocks).toEqual(blocks)
  },
)
