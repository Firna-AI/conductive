import { expect, it } from 'vitest'
import { agentBlocks } from './agent-blocks'
import {
  blocksOf,
  h,
  p,
  shortBlocks,
  table,
  type ShortBlock,
} from './agent-text-test-kit'

/** The blocks of an agent message that the agent still writes. */
function liveOf(...lines: string[]): ShortBlock[] {
  return shortBlocks(agentBlocks(lines.join('\n'), true))
}

it('closes each open mark at the end of live text, only in the paragraph, heading, or table cell where the text ends, and keeps a finished message as typed', () => {
  expect({
    label: liveOf('Priya left two comments.', '', '**Next:'),
    finished: blocksOf('Priya left two comments.', '', '**Next:'),
    pattern: liveOf('It runs tests/**/*.test.ts, then **the build'),
    order: liveOf('**Run *the tests ~~twice'),
    newLine: liveOf('**Next:', ''),
    blankLine: liveOf('**Next:', '', ''),
    heading: liveOf('## Plan *now'),
    headingDone: liveOf('## Plan *now', ''),
    underline: liveOf('**Plan', '---'),
    cell: liveOf('| Step | Note |', '| --- | --- |', '| 1 | **wait'),
    cellDone: liveOf('| Step | Note |', '| --- | --- |', '| 1 | **wait |'),
    task: liveOf('- [ ] **Push the branch'),
    code: liveOf('**Note', '', '```', 'npm ci'),
    paired: liveOf('**a *b/**/c'),
  }).toEqual({
    label: [p('Priya left two comments.'), p('<b>Next:</b>')],
    finished: [p('Priya left two comments.'), p('**Next:')],
    pattern: [p('It runs tests/**/*.test.ts, then <b>the build</b>')],
    order: [p('<b>Run <em>the tests <del>twice</del></em></b>')],
    newLine: [p('<b>Next:</b>')],
    blankLine: [p('**Next:')],
    heading: [h(2, 'Plan <em>now</em>')],
    headingDone: [h(2, 'Plan *now')],
    underline: [p('<b>Plan ---</b>')],
    cell: [table(['Step', 'Note'], [['1', '<b>wait</b>']])],
    cellDone: [table(['Step', 'Note'], [['1', '**wait']])],
    task: [
      {
        kind: 'ul',
        items: [{ checked: false, blocks: [p('<b>Push the branch</b>')] }],
      },
    ],
    code: [p('**Note'), { kind: 'code', text: 'npm ci', label: null }],
    paired: [p('<b>a *b/</b>/c')],
  })
})

it('closes the open mark of a live block that reads a reference link, and keeps the link, with the definitions of the whole message', () => {
  expect({
    full: liveOf('[1]: https://e.com/a', '', 'See [docs][1] and **then'),
    shortcut: liveOf('[docs]: https://e.com/a', '', 'See [docs] and *then'),
    image: liveOf(
      '[pic]: https://e.com/a.png',
      '',
      'See ![logo][pic] and ~~then',
    ),
  }).toEqual({
    full: [p('See {[docs][1]} and <b>then</b>')],
    shortcut: [p('See {[docs]} and <em>then</em>')],
    image: [p('See {img logo -> https://e.com/a.png} and <del>then</del>')],
  })
})
