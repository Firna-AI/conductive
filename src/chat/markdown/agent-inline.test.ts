import { expect, it } from 'vitest'
import { agentBlocks } from './agent-blocks'
import { blocksOf, h, p, table } from './agent-text-test-kit'

it('keeps ten thousand paired marks without a deep chat tree or lost text', () => {
  const source = '**'.repeat(10_000) + 'leaf' + '**'.repeat(10_000)
  expect(() => agentBlocks(source)).not.toThrow()
  expect(blocksOf(source)).toEqual([
    p(
      '<b>'.repeat(12) +
        '**'.repeat(9_988) +
        'leaf' +
        '**'.repeat(9_988) +
        '</b>'.repeat(12),
    ),
  ])
})

it('keeps repository paths and query marks inside bare addresses while outer bold still pairs', () => {
  for (const address of [
    'https://github.com/acme/app/tree/main/__tests__/a.test.ts',
    'https://github.com/acme/app/blob/main/pkg/__init__.py',
    'https://example.com/a*b*c',
    'https://example.com/?q=**two**',
  ]) {
    expect(blocksOf(address), address).toEqual([p(address)])
  }
  const address = 'https://github.com/acme/app/tree/main/__tests__/a.test.ts'
  expect(blocksOf(`**See ${address}**`)).toEqual([p(`<b>See ${address}</b>`)])
})

it('protects bare addresses when the chat reparses a flattened deep container', () => {
  const address = 'https://example.com/a*b*c'
  expect(JSON.stringify(agentBlocks('> '.repeat(17) + address))).toContain(
    address,
  )
})

it('reads marks, entities, escapes, and code as CommonMark does, so bold holds code and a mark without its pair shows as typed', () => {
  expect({
    marks: blocksOf(
      '**Bold `useAddressAutocomplete`**, __bold__, *emphasis*, _emphasis_, and ~~strikethrough~~.',
    ),
    typed: blocksOf(
      'Wait ~250 ms, at most 3 * 250 ms, for tests/**/*.test.ts and **the rest.',
    ),
    escapes: blocksOf('Fish &amp; chips, \\*not emphasis\\*, a\\_b, &#42;.'),
    code: blocksOf('Run `` git log --format=`%h` `` and `` ` ``.'),
    inWord: blocksOf('Read snake_case_name and 2*3*4.'),
  }).toEqual({
    marks: [
      p(
        '<b>Bold `useAddressAutocomplete`</b>, <b>bold</b>, <em>emphasis</em>, <em>emphasis</em>, and <del>strikethrough</del>.',
      ),
    ],
    typed: [
      p(
        'Wait ~250 ms, at most 3 * 250 ms, for tests/**/*.test.ts and **the rest.',
      ),
    ],
    escapes: [p('Fish & chips, *not emphasis*, a_b, *.')],
    code: [p('Run `git log --format=`%h`` and ```.')],
    inWord: [p('Read snake_case_name and 2<em>3</em>4.')],
  })
})

it('reads each form of a line-break tag and each hard line break as a line break, and keeps other tags and a tag in code as text', () => {
  expect({
    forms: blocksOf('a<br>b<BR/>c<br />d\\', 'e  ', 'f'),
    text: blocksOf('</br> <br class="x"> <b>bold</b> `<br>`'),
    parts: blocksOf(
      '## One<br>two',
      '- One<br>two',
      '',
      '> One<br>two',
      '',
      '| Address |',
      '| --- |',
      '| 221B Baker Street<br>London |',
    ),
  }).toEqual({
    forms: [p('a<br>b<br>c<br>d<br>e<br>f')],
    text: [p('</br> <br class="x"> <b>bold</b> `<br>`')],
    parts: [
      h(2, 'One<br>two'),
      { kind: 'ul', items: [[p('One<br>two')]] },
      { kind: 'quote', blocks: [p('One<br>two')] },
      table(['Address'], [['221B Baker Street<br>London']]),
    ],
  })
})

it('leaves out a block of only line breaks, and keeps the line breaks of each other block for the chat to draw by the rule of the whole block', () => {
  expect({
    only: blocksOf('Before', '', '<br> <br><br>', '', '## <br>', '', 'After'),
    cell: blocksOf('| A | B |', '| --- | --- |', '| <br>x<br> | <br> |'),
  }).toEqual({
    only: [p('Before'), p('After')],
    cell: [table(['A', 'B'], [['<br>x<br>', '']])],
  })
})
