import type { ChatItem } from './conversations'

/** A list of a message, with the lists that the agent indents under it. */
export type MessageList = {
  kind: 'list'
  numbered: boolean
  items: readonly MessageListItem[]
}

/** An item of a list: its text, and the list under it, if any. */
type MessageListItem = { text: string; list?: MessageList }

/** A bulleted list, each item a line of text. */
export function bullets(...texts: string[]): MessageList {
  return {
    kind: 'list',
    numbered: false,
    items: texts.map((text) => ({ text })),
  }
}

/** A numbered list, each item with its text and the list under it. */
function steps(...items: MessageListItem[]): MessageList {
  return { kind: 'list', numbered: true, items }
}

/**
 * A reply with two choices for the user. The agent indents the lettered
 * options of each choice under it, so they show as a list in its item.
 */
const choicesTurn: readonly ChatItem[] = [
  {
    kind: 'user',
    id: 'ask-provider',
    text: 'Check both address providers, then tell me what you need from me.',
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
    id: 'choices',
    blocks: [
      'Both providers return the same suggestions for the test addresses. Two choices need your answer:',
      steps(
        {
          text: 'Provider (medium effort). The form calls the places proxy at `/api/places` today.',
          list: bullets(
            'a. Keep the places proxy. It runs on the server, so the browser loads no key.',
            'b. Move to the hosted widget. It needs a key in the browser.',
            'Recommended: a.',
          ),
        },
        {
          text: 'Manual fields (small effort). The street, city, and postcode fields show under the suggestions.',
          list: bullets(
            'a. Keep them as a fallback.',
            'b. Hide them until the person chooses to type the address.',
            'Recommended: a.',
          ),
        },
      ),
    ],
  },
  { kind: 'turn-end', id: 'turn-end', duration: '42s', files: [] },
]

/**
 * A finished turn whose work holds a plan with steps under each item. The
 * plan folds with the work, before the answer.
 */
const planInWork: readonly ChatItem[] = [
  {
    kind: 'user',
    id: 'ask-debounce',
    text: 'Debounce the address lookups, so we stay under the rate limit.',
  },
  {
    kind: 'agent',
    id: 'plan',
    blocks: [
      'The plan, in this order:',
      steps(
        {
          text: 'Add the debounce to `useAddressAutocomplete`.',
          list: bullets(
            'Wait 250 ms after the last key press.',
            'Cancel the lookup that a new key press replaces.',
          ),
        },
        {
          text: 'Cover it with a test.',
          list: bullets('Use a fake clock, so the test never sleeps.'),
        },
      ),
    ],
  },
  {
    kind: 'tool',
    id: 'edit-hook',
    tool: 'edit',
    target: 'src/app/checkout/useAddressAutocomplete.ts',
    detail: '+18 −3',
    status: 'done',
  },
  {
    kind: 'tool',
    id: 'unit',
    tool: 'run',
    target: 'npm test -- checkout',
    detail: '15 passed',
    status: 'done',
  },
  {
    kind: 'agent',
    id: 'done',
    blocks: ['Done. Each lookup now waits 250 ms after the last key press.'],
  },
  { kind: 'turn-end', id: 'turn-end', duration: '1m 48s', files: [] },
]

/** The chats of the list pages: replies with lists under their items. */
export const listConversations = {
  'nested-lists': choicesTurn,
  'nested-lists-in-work': planInWork,
} as const satisfies Record<string, readonly ChatItem[]>
