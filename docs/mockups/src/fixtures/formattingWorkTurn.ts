import {
  code,
  emphasis,
  lineBreak,
  p,
  quote,
  rule,
  strike,
  table,
  type Inline,
} from './agentText'
import type { ChatItem, ToolKind } from './conversations'
import { pullRequest } from './pullRequests'

/**
 * The address of the phone test of Priya, on two lines, as an agent writes
 * an address with a line-break tag.
 */
export const twoLineAddress: readonly Inline[] = [
  '221B Baker Street',
  lineBreak,
  'London NW1 6XE',
]

/** A tool call of a turn that finished. */
function done(
  id: string,
  tool: ToolKind,
  target: string,
  detail?: string,
): ChatItem {
  return { kind: 'tool', id, tool, target, detail, status: 'done' }
}

/**
 * A finished turn whose work holds four messages with quotes, rules,
 * emphasis, strikethrough, and line breaks, before the answer. With the
 * last message of the fold open, the first three show closed lines: a
 * quote with emphasis, a rule and strikethrough, and a table with a line
 * break in a cell. The fourth shows each part in its open line.
 */
export const formattingInWork: readonly ChatItem[] = [
  {
    kind: 'user',
    id: 'ask-changes',
    text: `Make both changes that Priya asked for, then push them to #${pullRequest.number}.`,
  },
  {
    kind: 'agent',
    id: 'start',
    blocks: [
      quote(
        p(
          'Each key press sends a lookup. Can we wait until the person ',
          emphasis('stops'),
          ' typing?',
        ),
      ),
      p("I'll add the wait to ", code('useAddressAutocomplete'), ' first.'),
    ],
  },
  done(
    'edit-hook',
    'edit',
    'src/app/checkout/useAddressAutocomplete.ts',
    '+18 −3',
  ),
  {
    kind: 'agent',
    id: 'fields',
    blocks: [
      p('The wait is in.'),
      rule,
      p(
        strike('Hide the fields while the list is open.'),
        ' Next, the fields move down under the list.',
      ),
    ],
  },
  done('edit-form', 'edit', 'src/app/checkout/AddressForm.tsx', '+9 −2'),
  done('unit', 'run', 'npm test -- checkout', '15 passed'),
  {
    kind: 'agent',
    id: 'phone-test',
    blocks: [
      p('The phone test fills the form from the first suggestion:'),
      table(
        [null, null],
        ['Field', 'Value'],
        [
          ['Address', twoLineAddress],
          ['Country', 'United Kingdom'],
        ],
      ),
    ],
  },
  done(
    'e2e',
    'run',
    'npx playwright test checkout.spec.ts --project=phone',
    '3 passed',
  ),
  {
    kind: 'agent',
    id: 'reply',
    blocks: [
      p(
        'Both changes pass. ',
        strike('Hide the fields while the list is open'),
        " is no longer needed, so I'll reply to Priya:",
      ),
      quote(
        p(
          'The lookups now wait 250 ms after the ',
          emphasis('last'),
          ' key press, and the fields move down under the list.',
        ),
      ),
      rule,
      p('The phone test typed:', lineBreak, ...twoLineAddress),
    ],
  },
  done('push', 'run', 'git push'),
  {
    kind: 'agent',
    id: 'done',
    blocks: [
      p(
        `Done. I pushed both changes to #${pullRequest.number} and replied to Priya.`,
      ),
    ],
  },
  { kind: 'turn-end', id: 'turn-end', duration: '3m 02s', files: [] },
]
