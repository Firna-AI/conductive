import type { ChatItem } from './conversations'

/**
 * A finished turn whose answer compares the two address providers in a
 * table. Some cells hold two lines, which the agent split with the three
 * forms of the line-break tag: `<br>`, `<br/>`, and `<br />`.
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
      'Both return the same suggestions for the test addresses. They differ in where the key lives:',
      {
        kind: 'table',
        align: [null, null, null],
        head: ['Provider', 'Pros', 'Cons'],
        rows: [
          [
            'Places proxy',
            'Runs on the server<br>No key in the browser',
            'One more hop for each lookup',
          ],
          [
            'Hosted widget',
            'No server code<br/>Styled suggestions',
            'Needs a key in the browser<br />Adds 40 KB to `checkout`',
          ],
        ],
      },
      'I recommend the places proxy, because the key stays on the server.',
    ],
  },
  { kind: 'turn-end', id: 'turn-end', duration: '38s', files: [] },
]
