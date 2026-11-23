import { code, lineBreak, p, table } from './agentText'
import type { ChatItem } from './conversations'

/**
 * A finished turn whose answer compares the two address providers in a
 * table. Some cells hold two lines, which the agent split with the three
 * forms of the line-break tag: `<br>`, `<br/>`, and `<br />`. The app reads
 * each form as a line break.
 */
export const tableLineBreaks: readonly ChatItem[] = [
  {
    kind: 'user',
    id: 'ask-providers',
    text: 'Compare the two address providers for me.',
  },
  {
    kind: 'tool',
    id: 'compare',
    tool: 'run',
    target: 'npm test -- checkout/providers',
    detail: '8 passed',
    status: 'done',
  },
  {
    kind: 'agent',
    id: 'providers',
    blocks: [
      p(
        'Both return the same suggestions for the test addresses. They differ in where the key lives:',
      ),
      table(
        [null, null, null],
        ['Provider', 'Pros', 'Cons'],
        [
          [
            'Places proxy',
            ['Runs on the server', lineBreak, 'No key in the browser'],
            'One more hop for each lookup',
          ],
          [
            'Hosted widget',
            ['No server code', lineBreak, 'Styled suggestions'],
            [
              'Needs a key in the browser',
              lineBreak,
              'Adds 40 KB to ',
              code('checkout'),
            ],
          ],
        ],
      ),
      p('I recommend the places proxy, because the key stays on the server.'),
    ],
  },
  { kind: 'turn-end', id: 'turn-end', duration: '38s', files: [] },
]
