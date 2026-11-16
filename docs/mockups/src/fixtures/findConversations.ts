import type { ChatItem, ToolKind } from './conversations'

function done(
  id: string,
  tool: ToolKind,
  target: string,
  detail?: string,
): ChatItem {
  return { kind: 'tool', id, tool, target, detail, status: 'done' }
}

/**
 * The second turn of the first session: a cache of the answers of the
 * places proxy. Its first message holds "places" late in its text, so its
 * closed line hides that match.
 */
const cacheTurn: readonly ChatItem[] = [
  {
    kind: 'user',
    id: 'cache-ask',
    text: 'Cache the places lookups for a minute, so the same street does not ask the proxy twice.',
  },
  {
    kind: 'agent',
    id: 'cache-plan',
    blocks: [
      "I'll keep each answer of the proxy in a small cache in the hook, keyed by the query. The places proxy sends no cache headers, so the browser cache does not help here.",
    ],
  },
  done(
    'cache-hook',
    'edit',
    'src/app/checkout/useAddressAutocomplete.ts',
    '+14 −2',
  ),
  done('cache-test', 'edit', 'tests/checkout/address.test.ts', '+20'),
  done('cache-unit', 'run', 'npm test -- checkout', '16 passed'),
  {
    kind: 'agent',
    id: 'cache-done',
    blocks: [
      'Done. The hook keeps each answer of the places proxy for 60 seconds, so the same street shows its suggestions at once.',
    ],
  },
  {
    kind: 'turn-end',
    id: 'cache-end',
    duration: '1m 47s',
    files: [
      {
        path: 'src/app/checkout/useAddressAutocomplete.ts',
        change: 'modified',
        added: 14,
        removed: 2,
      },
      {
        path: 'tests/checkout/address.test.ts',
        change: 'modified',
        added: 20,
        removed: 0,
      },
    ],
  },
]

/** The third turn: a question about the rate limit of the proxy. */
const limitTurn: readonly ChatItem[] = [
  {
    kind: 'user',
    id: 'limit-ask',
    text: 'Does the cache count against the rate limit of the places proxy?',
  },
  done('limit-read', 'read', 'src/app/api/places/limits.ts'),
  {
    kind: 'agent',
    id: 'limit-done',
    blocks: [
      'A cached answer sends no request, so only new lookups count. The proxy allows 10 requests a second for each session.',
    ],
  },
  { kind: 'turn-end', id: 'limit-end', duration: '19s', files: [] },
]

/**
 * The long chat of the find bar (find decision 1 B): the finished turn of
 * the canonical chat, then two more turns of the same session. "places"
 * shows in the first message, in a message line and in two call lines of
 * the first fold, and in each later turn, also in the closed second fold.
 * `history` is the finished turn of the canonical chat.
 */
export function findConversations(history: readonly ChatItem[]) {
  return {
    find: [...history, ...cacheTurn, ...limitTurn],
  } as const satisfies Record<string, readonly ChatItem[]>
}
