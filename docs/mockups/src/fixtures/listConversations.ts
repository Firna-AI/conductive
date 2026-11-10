import type { ChatItem } from './conversations'

/** A list of a message, with the lists that the agent indents under it. */
export type MessageList = {
  numbered: boolean
  items: readonly MessageListItem[]
}

/** An item of a list: its text, and the list under it, if any. */
type MessageListItem = { text: string; list?: MessageList }

/** A bulleted list of options, each a line of text. */
function options(...texts: string[]): MessageList {
  return { numbered: false, items: texts.map((text) => ({ text })) }
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
    ],
    list: {
      numbered: true,
      items: [
        {
          text: 'Provider (medium effort). The form calls the places proxy at `/api/places` today.',
          list: options(
            'a. Keep the places proxy. It runs on the server, so the browser loads no key.',
            'b. Move to the hosted widget. It needs a key in the browser.',
            'Recommended: a.',
          ),
        },
        {
          text: 'Manual fields (small effort). The street, city, and postcode fields show under the suggestions.',
          list: options(
            'a. Keep them as a fallback.',
            'b. Hide them until the person chooses to type the address.',
            'Recommended: a.',
          ),
        },
      ],
    },
  },
  { kind: 'turn-end', id: 'turn-end', duration: '42s', files: [] },
]

/** The keys of the chats of the list pages. */
export const listConversationKeys = ['nested-lists'] as const

/** The chats of the list pages: a reply with lists under its items. */
export const listConversations = {
  'nested-lists': choicesTurn,
} as const satisfies Record<
  (typeof listConversationKeys)[number],
  readonly ChatItem[]
>
