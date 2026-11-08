/**
 * Chat transcripts. Text in backticks renders as inline code.
 */

import type { LostReason, LostWhat } from '../components/chat/lostCopy'
import { attachmentConversations } from './attachmentConversations'
import type { Attachment } from './attachments'
import { changedFiles, type ChangedFile } from './files'
import { linkedConversations } from './linkedConversations'
import { lostConversations } from './lostConversations'
import type { MacCommandRequest, MacCommandState } from './mac'
import { macConversations } from './macConversations'
import type { PersonKey } from './members'
import { unavailableConversations } from './unavailableConversations'

export type ToolKind = 'read' | 'search' | 'create' | 'edit' | 'run'

type ToolCallStatus = 'done' | 'running' | 'stopped'

export type ChatItem =
  | {
      kind: 'user'
      id: string
      text: string
      /** The files of the message, which show under it. */
      attachments?: readonly Attachment[]
      queued?: boolean
    }
  | {
      kind: 'agent'
      id: string
      paragraphs: readonly string[]
      bullets?: readonly string[]
    }
  | {
      kind: 'tool'
      id: string
      tool: ToolKind
      target: string
      detail?: string
      /** The size of output that the runner left out of `detail`. */
      omittedDetailBytes?: number
      status: ToolCallStatus
    }
  | {
      /** A command that the agent asks to run on the Mac of the sender. */
      kind: 'mac-command'
      id: string
      request: MacCommandRequest
      state: MacCommandState
    }
  | {
      /**
       * A stopped turn. All members see the same chat, so the item records
       * `by`, the member who pressed Stop (decision 72). A turn that stopped
       * with no Stop, such as when the cloud computer stopped, has no `by`.
       */
      kind: 'stopped'
      id: string
      by?: PersonKey
      /** The changed files of the turn past the 200 that the runner lists. */
      omittedFiles?: number
      /** The cloud computer could not read the changed files. */
      filesUnavailable?: true
    }
  | { kind: 'error'; id: string; text: string }
  | { kind: 'working'; id: string; elapsed: string }
  | {
      kind: 'turn-end'
      id: string
      duration: string
      files: readonly ChangedFile[]
      /** The files of the turn past the 200 that the runner lists. */
      omittedFiles?: number
      /** The cloud computer could not read the changed files: none listed. */
      filesUnavailable?: true
    }
  | {
      /** A runner event that the workspace refused (decision 76). */
      kind: 'lost'
      id: string
      what: LostWhat
      reason: LostReason
    }
  | {
      /**
       * The first line of a linked session. A member's message in another
       * session opened it, because the login of the starter of that session
       * was not available. `from` is the title of that session, which the
       * line links to.
       */
      kind: 'linked'
      id: string
      from: string
    }

/** One tool call of an agent turn. */
export type ToolCallItem = Extract<ChatItem, { kind: 'tool' }>

export const conversationKeys = [
  'history',
  'running',
  'steer',
  'interrupted',
  'sandbox-stopped',
  'failed',
  'queued',
  'first-turn',
  'mac-waiting',
  'mac-waiting-many',
  'mac-waiting-suite',
  'mac-denied',
  'mac-done',
  'mac-unavailable',
  'output-left-out',
  'output-left-out-running',
  'files-left-out',
  'lost-lines',
  'lost-turn-end',
  'files-unavailable',
  'stopped-files-unavailable',
  'linked',
  'sent-files',
  'queued-files',
] as const

export type ConversationKey = (typeof conversationKeys)[number]

function tool(
  id: string,
  kind: ToolKind,
  target: string,
  detail?: string,
): ChatItem {
  return { kind: 'tool', id, tool: kind, target, detail, status: 'done' }
}

const autocompleteStart: readonly ChatItem[] = [
  {
    kind: 'user',
    id: 'ask',
    text: 'Add address autocomplete to the checkout form. Use the places proxy at `/api/places`, and keep the manual fields as a fallback.',
  },
  {
    kind: 'agent',
    id: 'plan',
    paragraphs: ["I'll start with the checkout form and the places proxy."],
  },
  tool('read-form', 'read', 'src/app/checkout/AddressForm.tsx'),
  tool('read-proxy', 'read', 'src/app/api/places/route.ts'),
  tool('search-places', 'search', 'usePlaces', '2 results'),
  {
    kind: 'agent',
    id: 'approach',
    paragraphs: [
      "The proxy already returns predictions, so the work is in the form. I'll add a `useAddressAutocomplete` hook, show suggestions under the first address line, and fill the other fields when one is chosen.",
    ],
  },
  tool(
    'create-hook',
    'create',
    'src/app/checkout/useAddressAutocomplete.ts',
    '+64',
  ),
  tool('edit-form', 'edit', 'src/app/checkout/AddressForm.tsx', '+38 −6'),
  tool('remove-lookup', 'run', 'git rm src/app/checkout/postcodeLookup.ts'),
]

const autocompleteTests: readonly ChatItem[] = [
  tool('create-test', 'create', 'tests/checkout/address.test.ts', '+52'),
  tool('unit', 'run', 'npm test -- checkout', '14 passed'),
]

const e2eTarget = 'npx playwright test checkout.spec.ts'

const autocompleteEnd: readonly ChatItem[] = [
  tool('e2e', 'run', e2eTarget, '3 passed'),
  tool('readme', 'edit', 'README.md', '+4 −1'),
  tool('pr', 'run', 'gh pr create --fill', '#482'),
  {
    kind: 'agent',
    id: 'done',
    paragraphs: ['Done. Checkout now suggests addresses as you type.'],
    bullets: [
      'Choosing a suggestion fills the street, city, and postcode.',
      'Manual entry still works when there is no match.',
      'Removed the old postcode lookup, which the suggestions replace.',
      'Unit tests cover `useAddressAutocomplete`, and the checkout end-to-end tests pass.',
      'Opened pull request #482.',
    ],
  },
  { kind: 'turn-end', id: 'turn-end', duration: '4m 12s', files: changedFiles },
]

const e2eRunning: ChatItem = {
  kind: 'tool',
  id: 'e2e',
  tool: 'run',
  target: e2eTarget,
  status: 'running',
}

/** The first message of the workspace that the create flow makes. */
export const savedCartsMessage =
  'Let signed-in shoppers save their cart and restore it on another device. Store carts in the existing Postgres database, and add tests.'

const savedCartsAsk = {
  kind: 'user',
  id: 'ask',
  text: savedCartsMessage,
} as const

const history: readonly ChatItem[] = [
  ...autocompleteStart,
  ...autocompleteTests,
  ...autocompleteEnd,
]

/** The turn up to its end-to-end run, which a stop cut off. */
const cutOffTurn: readonly ChatItem[] = [
  ...autocompleteStart,
  ...autocompleteTests,
  { ...e2eRunning, status: 'stopped' },
]

/**
 * The next message that a user writes after the turn ends. In the linked
 * session, it is the message of the member who opened that session.
 */
export const followUpDraft =
  'Show a loading state under the address line while the lookup runs.'

export const conversations: Readonly<
  Record<ConversationKey, readonly ChatItem[]>
> = {
  history,
  running: [
    ...autocompleteStart,
    ...autocompleteTests,
    e2eRunning,
    { kind: 'working', id: 'working', elapsed: '2m 41s' },
  ],
  steer: [
    ...autocompleteStart,
    ...autocompleteTests,
    e2eRunning,
    { kind: 'working', id: 'working', elapsed: '2m 58s' },
  ],
  interrupted: [...cutOffTurn, { kind: 'stopped', id: 'stopped', by: 'cal' }],
  /** The cloud computer stopped during the turn, and no member pressed Stop. */
  'sandbox-stopped': [...cutOffTurn, { kind: 'stopped', id: 'stopped' }],
  failed: [
    ...autocompleteStart,
    {
      kind: 'error',
      id: 'error',
      text: 'Claude is overloaded right now.',
    },
  ],
  queued: [{ ...savedCartsAsk, queued: true }],
  'first-turn': [
    savedCartsAsk,
    {
      kind: 'agent',
      id: 'plan',
      paragraphs: ["I'll check how carts and sessions work today."],
    },
    tool('read-cart', 'read', 'src/lib/cart.ts'),
    tool('read-schema', 'read', 'prisma/schema.prisma'),
    {
      kind: 'tool',
      id: 'search-session',
      tool: 'search',
      target: 'getServerSession',
      status: 'running',
    },
    { kind: 'working', id: 'working', elapsed: '24s' },
  ],
  ...macConversations(history),
  ...lostConversations(history),
  ...unavailableConversations({ history, cutOff: cutOffTurn }),
  ...linkedConversations(followUpDraft),
  ...attachmentConversations({ history, firstMessage: savedCartsMessage }),
}

/** The steer message that the user types while a turn runs. */
export const steerDraft =
  'Also debounce the lookups to 250 ms, so we stay under the rate limit.'
