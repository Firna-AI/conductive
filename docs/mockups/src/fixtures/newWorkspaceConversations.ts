import type { ChatItem } from './conversations'

/** The first message of the workspace that the create flow makes. */
export const savedCartsMessage =
  'Let signed-in shoppers save their cart and restore it on another device. Store carts in the existing Postgres database, and add tests.'

/**
 * The message that Priya, a member, writes after the first start failed.
 * Send queues it under the earlier messages until the sandbox is ready.
 */
export const savedCartsDraft =
  'Show a short notice when a saved cart is restored.'

const ask = { kind: 'user', id: 'ask', text: savedCartsMessage } as const

/** The second message, which the user sends during the first start. */
const followUp = {
  kind: 'user',
  id: 'follow-up',
  text: 'Keep a saved cart for 30 days after its last change, then delete it.',
} as const

/** Priya's message, after Send queued it. */
const draft = {
  kind: 'user',
  id: 'restore-notice',
  text: savedCartsDraft,
} as const

/**
 * The transcripts of the workspace that the create flow makes. Its messages
 * wait in the queue of the workspace until the sandbox is ready: during the
 * first start, after a failed first start, and while Try again starts a new
 * cloud computer. Then the agent gets them in their order.
 */
export const newWorkspaceConversations = {
  queued: [{ ...ask, queued: true }],
  'queued-follow-up': [
    { ...ask, queued: true },
    { ...followUp, queued: true },
  ],
  'queued-retry': [
    { ...ask, queued: true },
    { ...followUp, queued: true },
    { ...draft, queued: true },
  ],
  'first-turn': [
    ask,
    followUp,
    {
      kind: 'agent',
      id: 'plan',
      blocks: ["I'll check how carts and sessions work today."],
    },
    {
      kind: 'tool',
      id: 'read-cart',
      tool: 'read',
      target: 'src/lib/cart.ts',
      status: 'done',
    },
    {
      kind: 'tool',
      id: 'read-schema',
      tool: 'read',
      target: 'prisma/schema.prisma',
      status: 'done',
    },
    {
      kind: 'tool',
      id: 'search-session',
      tool: 'search',
      target: 'getServerSession',
      status: 'running',
    },
    { kind: 'working', id: 'working', elapsed: '24s' },
  ],
} as const satisfies Record<string, readonly ChatItem[]>
