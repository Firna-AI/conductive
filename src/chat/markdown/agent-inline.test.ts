import { expect, it } from 'vitest'
import { blocksOf, h, p, table } from './agent-text-test-kit'

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

it('draws no line break at the start or the end of a block, no block of only line breaks, and at most one empty line for a run of breaks', () => {
  expect({
    ends: blocksOf('<br><br>Start and end<br> <br>'),
    only: blocksOf('Before', '', '<br> <br><br>', '', '## <br>', '', 'After'),
    run: blocksOf('One<br><br><br> <br>two<br>**<br><br>three**'),
    cell: blocksOf('| A | B |', '| --- | --- |', '| <br>x<br> | <br> |'),
  }).toEqual({
    ends: [p('Start and end')],
    only: [p('Before'), p('After')],
    run: [p('One<br><br>two<br><b><br>three</b>')],
    cell: [table(['A', 'B'], [['x', '']])],
  })
})
