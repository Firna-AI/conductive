import type { ChatItem } from './conversations'
import { newWorkspaceConversations } from './newWorkspaceConversations'
import {
  autocompleteSessions,
  savedCartsSession,
  sessionLink,
  type LinkableSession,
} from './sessionLinks'
import { debounceMessage } from './sessions'

const { autocomplete, debounce, postcode, untitled } = autocompleteSessions

/**
 * The text of a message from an agent tool. The app adds a blank line, a
 * `---` line, and a `Sent by:` line with the address of the sending session
 * at the end of the text that the agent wrote. The chat shows that address
 * as a session chip.
 */
function sentByAgent(text: string, sender: LinkableSession): string {
  return [text, '', '---', `Sent by: ${sessionLink(sender)}`].join('\n')
}

/**
 * The message that the agent of the second session, Debounce the address
 * lookups to 250 ms, sent to the first session of the same workspace.
 */
const toAutocomplete = sentByAgent(
  'The address lookups now wait 250 ms after the last key press. `useAddressAutocomplete` takes a `delay` option, so set `delay: 0` in the tests of the address form.',
  debounce,
)

/**
 * The message that the same agent sent to the session of Saved carts, in
 * another workspace. It names a closed session of its own workspace.
 */
const toSavedCarts = sentByAgent(
  `When a saved cart restores an address, fill the fields with \`setAddress\` from \`useAddressAutocomplete\`, which #482 adds. It skips the lookup, so the suggestions stay closed. Check the postcode first, with the rule of ${sessionLink(postcode)}.`,
  debounce,
)

/**
 * A draft in the second session with two pasted session links: the session
 * with only a screenshot, which has no title, and the postcode check, whose
 * title is long. Both sessions are closed.
 */
export const sessionLinkDraft = `Check that the bug in the screenshot of ${sessionLink(untitled)} is gone, and keep the rule of ${sessionLink(postcode)}.`

function done(
  id: string,
  tool: Extract<ChatItem, { kind: 'tool' }>['tool'],
  target: string,
  detail?: string,
): ChatItem {
  return { kind: 'tool', id, tool, target, detail, status: 'done' }
}

/** The first turn of the second session, which debounced the lookups. */
const debounceTurn: readonly ChatItem[] = [
  { kind: 'user', id: 'debounce-ask', text: debounceMessage },
  done(
    'edit-hook',
    'edit',
    'src/app/checkout/useAddressAutocomplete.ts',
    '+9 −3',
  ),
  done('edit-test', 'edit', 'tests/checkout/address.test.ts', '+14'),
  done('unit', 'run', 'npm test -- checkout', '16 passed'),
  {
    kind: 'agent',
    id: 'debounce-done',
    blocks: [
      'The lookups now wait 250 ms after the last key press. A new test types a whole address at once, and only one lookup runs.',
    ],
  },
  {
    kind: 'turn-end',
    id: 'debounce-end',
    duration: '1m 06s',
    files: [
      {
        path: 'src/app/checkout/useAddressAutocomplete.ts',
        change: 'modified',
        added: 9,
        removed: 3,
      },
      {
        path: 'tests/checkout/address.test.ts',
        change: 'modified',
        added: 14,
        removed: 0,
      },
    ],
  },
]

/**
 * The answer of the second session after its agent sent both messages. A
 * bare link and a Markdown link to a session show as session chips.
 */
const sendsAnswer: readonly string[] = [
  `I told ${sessionLink(autocomplete)} to set \`delay: 0\` in its tests. I told [Saved carts](${sessionLink(savedCartsSession)}) to fill a restored address with \`setAddress\`, which skips the lookup.`,
  'Both sessions work on it now.',
]

/** The first turn of Saved carts up to the message from the other session. */
const savedCartsWork: readonly ChatItem[] = [
  ...newWorkspaceConversations['first-turn'].slice(0, 5),
  done('search-session', 'search', 'getServerSession', '3 results'),
]

/**
 * The chats of the sessions that a message from an agent tool reaches, and
 * the chat of the session that sent it. `history` is the finished turn of
 * the first session of Checkout address autocomplete.
 */
export function sessionLinkConversations(history: readonly ChatItem[]) {
  return {
    'sent-by': [
      ...history,
      { kind: 'user', id: 'sent-by', text: toAutocomplete },
      {
        kind: 'tool',
        id: 'find-delay',
        tool: 'search',
        target: 'useAddressAutocomplete(',
        status: 'running',
      },
      { kind: 'working', id: 'working', elapsed: '5s' },
    ],
    'sent-by-other': [
      ...savedCartsWork,
      { kind: 'user', id: 'sent-by', text: toSavedCarts, during: true },
      {
        kind: 'tool',
        id: 'view-482',
        tool: 'run',
        target: 'gh pr view 482 --json files',
        status: 'running',
      },
      { kind: 'working', id: 'working', elapsed: '41s' },
    ],
    'session-links': [
      ...debounceTurn,
      {
        kind: 'user',
        id: 'tell',
        text: 'Tell Address autocomplete and Saved carts what changed.',
      },
      done('send-autocomplete', 'run', 'conductive sessions send'),
      done('send-carts', 'run', 'conductive sessions send'),
      { kind: 'agent', id: 'sends-answer', blocks: sendsAnswer },
      { kind: 'turn-end', id: 'sends-end', duration: '18s', files: [] },
    ],
  } as const satisfies Record<string, readonly ChatItem[]>
}
