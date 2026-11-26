import { expect, it } from 'vitest'
import { previewDocument } from './preview-blocks'

const text = (value: string) => ({ kind: 'text', text: value }) as const
const lineBreak = { kind: 'break' } as const

it('keeps fence labels and uses null for unlabelled and indented preview code, and colours the lines of a block whose label names a language', () => {
  const source = [
    '```Rust,ignore',
    'fn main() {}',
    '```',
    '',
    '```',
    'command output',
    '```',
    '',
    '    indented',
    '',
    '~~~TS title="example"',
    'let count = 1',
    '~~~',
  ].join('\n')
  expect(previewDocument(source).blocks).toEqual([
    {
      kind: 'code',
      text: 'fn main() {}',
      label: 'rust',
      lines: [
        [
          { kind: 'keyword', text: 'fn' },
          { kind: 'plain', text: ' main() {}' },
        ],
      ],
    },
    { kind: 'code', text: 'command output', label: null, lines: null },
    { kind: 'code', text: 'indented', label: null, lines: null },
    {
      kind: 'code',
      text: 'let count = 1',
      label: 'ts',
      lines: [
        [
          { kind: 'keyword', text: 'let' },
          { kind: 'plain', text: ' count = ' },
          { kind: 'number', text: '1' },
        ],
      ],
    },
  ])
})

it('draws a line-break tag as a line break, also in a table cell, with no break at the edge of a block and at most one empty line', () => {
  const source = [
    '<br>',
    '',
    'A<br/>B<BR /><br><br>C<br>',
    '',
    '| Head<br>row |',
    '| --- |',
    '| a<br>b |',
  ].join('\n')
  expect(previewDocument(source).blocks).toEqual([
    {
      kind: 'paragraph',
      text: [text('A'), lineBreak, text('B'), lineBreak, lineBreak, text('C')],
    },
    {
      kind: 'table',
      head: [[text('Head'), lineBreak, text('row')]],
      align: [null],
      rows: [[[text('a'), lineBreak, text('b')]]],
    },
  ])
})

it('reads a task box only as typed at the start of the first paragraph of an item, and takes it out of the text', () => {
  const source = [
    '- [ ]',
    '- \\[x] escaped',
    '- [x] **done**',
    '- # [ ] heading',
  ].join('\n')
  expect(previewDocument(source).blocks).toEqual([
    {
      kind: 'list',
      ordered: false,
      start: 1,
      items: [
        { checked: false, blocks: [] },
        {
          checked: null,
          blocks: [{ kind: 'paragraph', text: [text('[x] escaped')] }],
        },
        {
          checked: true,
          blocks: [
            {
              kind: 'paragraph',
              text: [{ kind: 'strong', children: [text('done')] }],
            },
          ],
        },
        {
          checked: null,
          blocks: [{ kind: 'heading', level: 1, text: [text('[ ] heading')] }],
        },
      ],
    },
  ])
})

it('keeps the text after a blank line under a task box with no words in its item, as CommonMark does', () => {
  expect(previewDocument('- [ ]\n\n  Continue.').blocks).toEqual([
    {
      kind: 'list',
      ordered: false,
      start: 1,
      items: [
        {
          checked: false,
          blocks: [{ kind: 'paragraph', text: [text('Continue.')] }],
        },
      ],
    },
  ])
})
