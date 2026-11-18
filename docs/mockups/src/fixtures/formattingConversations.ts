/**
 * The chats of the page of quotes, rules, and emphasis in replies, in
 * Checkout address autocomplete. The made-up sites, such as the places
 * API, use the reserved top-level domain `.example`.
 */

import type { AgentBlock, ChatItem, ToolKind } from './conversations'
import { formattingInWork } from './formattingWorkTurn'
import { quote, rule, twoLineAddress } from './proseBlocks'
import { pullRequest } from './pullRequests'

/** A tool call of a turn that finished. */
function done(
  id: string,
  tool: ToolKind,
  target: string,
  detail?: string,
): ChatItem {
  return { kind: 'tool', id, tool, target, detail, status: 'done' }
}

/** The end of a turn that changed no file. */
function end(duration: string): ChatItem {
  return { kind: 'turn-end', id: 'turn-end', duration, files: [] }
}

const commentsAsk: readonly ChatItem[] = [
  {
    kind: 'user',
    id: 'ask-comments',
    text: `What did Priya ask for in her review of #${pullRequest.number}?`,
  },
  done(
    'comments',
    'run',
    `gh pr view ${pullRequest.number} --comments`,
    '2 comments',
  ),
]

/**
 * The answer about the two comments of Priya: each comment in a quote, a
 * rule between them, emphasis and strikethrough, the address of her test
 * on two lines, and a bold label at its end.
 */
const commentsAnswer: readonly AgentBlock[] = [
  'Priya left two comments. The first is on the lookups:',
  quote(
    'Each key press sends a lookup. Can we wait until the person *stops* typing?',
  ),
  'A wait of 250 ms after the last key press sends one lookup in place of about 8. I can add it to `useAddressAutocomplete`.',
  rule,
  'The second is on the phone layout:',
  quote('On a phone, the list covers the city and postcode fields.'),
  `~~Hide the fields while the list is open.~~ Priya wants each field in view, so the fields can move down under the list. She tested with this address:<br>${twoLineAddress}`,
  `**Next:** say yes, and I'll make both changes and push them to #${pullRequest.number}.`,
]

/**
 * The same answer while the agent writes it. The bold label at its end has
 * its first `**`, and its closing `**` has not arrived. The open mark
 * closes at the end of the text, so the label shows bold at once.
 */
const writingAnswer: readonly AgentBlock[] = [
  ...commentsAnswer.slice(0, -1),
  '**Next:',
]

/**
 * An answer whose marks have no pair, so they show as typed: a `~` before
 * a number, a `*` between spaces, and the `**` and `*` of a file pattern.
 * HTML other than a line break stays text too.
 */
const typedAnswer: readonly AgentBlock[] = [
  'Each lookup waits ~250 ms after the last key press. With 3 retries, a refused lookup waits at most 3 * 250 ms.',
  'Vitest runs each file that matches tests/**/*.test.ts, so it finds the new test of the wait.',
  'Press <kbd>Esc</kbd> to close the list before the wait ends, and no lookup goes out.',
]

/**
 * An answer with three pictures: one at a web address, which shows its alt
 * text as a link, one at a path that names no file of the tree, which
 * shows its alt text only, and the screenshot in the workspace, whose link
 * opens its file.
 */
const imagesAnswer: readonly AgentBlock[] = [
  'The guide of the places API draws the flow of one session of lookups:',
  '![Session flow of the places API](https://docs.places.example/v1/images/session-flow.png)',
  'A session starts at the first key press and ends when the person chooses a suggestion. The proxy sends the same session token with each lookup, so the API bills each session once.',
  'The README keeps a copy of the diagram, ![Session flow](docs/session-flow.png), and the phone view is in ![Suggestions on a phone](/home/user/code/storefront/.context/shots/after.png).',
]

/** The chats of the formatting page, and of its work variant. */
export const formattingConversations = {
  formatting: [
    ...commentsAsk,
    { kind: 'agent', id: 'comments-answer', blocks: commentsAnswer },
    end('24s'),
  ],
  'formatting-writing': [
    ...commentsAsk,
    {
      kind: 'agent',
      id: 'comments-answer',
      blocks: writingAnswer,
      live: true,
    },
    { kind: 'working', id: 'working', elapsed: '19s' },
  ],
  'formatting-in-work': formattingInWork,
  'marks-as-typed': [
    {
      kind: 'user',
      id: 'ask-wait',
      text: 'How long does a lookup wait now, and which tests cover it?',
    },
    done('search-wait', 'search', 'debounce', '3 results'),
    { kind: 'agent', id: 'wait-answer', blocks: typedAnswer },
    end('12s'),
  ],
  'web-images': [
    {
      kind: 'user',
      id: 'ask-flow',
      text: 'How does the places API expect a session of lookups to flow?',
    },
    done(
      'read-guide',
      'run',
      'curl -s https://docs.places.example/v1/sessions',
    ),
    { kind: 'agent', id: 'flow-answer', blocks: imagesAnswer },
    end('16s'),
  ],
} as const satisfies Record<string, readonly ChatItem[]>
