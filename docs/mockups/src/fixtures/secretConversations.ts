import type { ChatItem } from './conversations'
import {
  agent,
  allowedByCal,
  allowedByPriya,
  answerLine,
  call,
  compareAsk,
  compared,
  countAsk,
  counted,
  outlived,
  run,
  waitsForReplica,
  working,
} from './secretChatParts'
import {
  iconsRequest,
  mapboxRequest,
  previewRequest,
  replicaRequest,
} from './secretRequests'

/** The keys of the chats of runs with secrets, for the workspace state. */
export const secretConversationKeys = [
  'secret-waiting',
  'secret-waiting-two',
  'secret-running',
  'secret-done',
  'secret-denied',
  'secret-pre-approved',
  'secret-value',
  'secret-late',
  'secret-late-allowed',
  'secret-late-ran',
  'secret-late-fallback',
  'secret-late-reconnect',
  'secret-late-denied',
  'secret-late-archived',
  'secret-in-work',
] as const

type SecretConversationKey = (typeof secretConversationKeys)[number]

/** The count of the addresses: the tool call, its run, and the answer. */
const countRan: readonly ChatItem[] = [
  ...countAsk,
  call(replicaRequest, 'done'),
  run(replicaRequest, 'allowed', { grant: allowedByCal }),
  counted,
]

/**
 * The chats of a run with secrets of the org (secrets decisions 1, 4, 10,
 * and 11), after the finished turn of `history`: a request that waits, its
 * results, and a request that outlived its tool call. The tool call line of
 * the agent stands beside each card. A run that ended keeps its turn
 * running, so its line shows, as the newest work of a turn does. The run in
 * the open work of its turn starts the chat instead.
 * `secretValueConversations.ts` holds the requests that ask for a value.
 */
export function secretConversations(
  history: readonly ChatItem[],
): Record<SecretConversationKey, readonly ChatItem[]> {
  const outlivedBy = (state: 'late' | 'late-denied', extra = {}) =>
    outlived(countAsk, run(replicaRequest, state, extra), waitsForReplica)
  const allowedLate = outlived(
    countAsk,
    run(replicaRequest, 'late-allowed', {
      grant: allowedByPriya,
      delivery: { kind: 'turn' },
    }),
    waitsForReplica,
  )
  return {
    'secret-waiting': [
      ...history,
      ...countAsk,
      call(replicaRequest, 'running'),
      run(replicaRequest, 'waiting'),
      working('24s'),
    ],
    'secret-waiting-two': [
      ...history,
      {
        kind: 'user',
        id: 'ask-preview',
        text: 'Deploy a preview that reads the production replica, so I can try the suggestions on real addresses.',
      },
      agent(
        'plan-preview',
        "I'll deploy a preview with the production replica as its database.",
      ),
      call(previewRequest, 'running'),
      run(previewRequest, 'waiting'),
      working('19s'),
    ],
    'secret-running': [
      ...history,
      ...countAsk,
      call(replicaRequest, 'running'),
      run(replicaRequest, 'allowed', { grant: allowedByCal }),
      working('41s'),
    ],
    'secret-done': [...history, ...countRan, working('52s')],
    'secret-denied': [
      ...history,
      ...countAsk,
      call(replicaRequest, 'done'),
      run(replicaRequest, 'denied', { deniedBy: 'cal' }),
      agent(
        'without-replica',
        "I can't count them without the replica. The test data has made-up addresses, so it can't size the fallback.",
      ),
      working('47s'),
    ],
    'secret-pre-approved': [
      ...history,
      {
        kind: 'user',
        id: 'ask-icons',
        text: 'Export the new address icons from the checkout designs.',
      },
      agent('plan-icons', "I'll export them from Figma."),
      call(iconsRequest, 'done'),
      run(iconsRequest, 'allowed', { grant: { kind: 'pre-approved' } }),
      agent(
        'icons-done',
        'I exported the 4 address icons into `src/app/checkout/icons`.',
      ),
      working('14s'),
    ],
    'secret-value': [
      ...history,
      ...compareAsk,
      call(mapboxRequest, 'done'),
      run(mapboxRequest, 'allowed', {
        grant: { kind: 'value', lifetime: 'minutes', by: 'cal' },
      }),
      compared,
      working('40s'),
    ],
    'secret-late': [...history, ...outlivedBy('late')],
    'secret-late-allowed': [
      ...history,
      ...allowedLate,
      answerLine(replicaRequest, allowedByPriya),
      working('6s'),
    ],
    'secret-late-ran': [
      ...history,
      ...allowedLate,
      answerLine(replicaRequest, allowedByPriya),
      call(replicaRequest, 'running', 'secret-call-again'),
      {
        ...run(replicaRequest, 'allowed', { grant: allowedByPriya }),
        id: 'secret-run-again',
      },
      working('9s'),
    ],
    // Priya sent the question while Cal shared his login, and Cal stopped
    // sharing it, so the turn for Priya cannot run (secrets decision 10 B).
    'secret-late-fallback': [
      ...history,
      ...outlived(
        countAsk,
        run(replicaRequest, 'late-allowed', {
          grant: allowedByCal,
          delivery: { kind: 'next-message' },
        }),
        waitsForReplica,
      ),
    ],
    // The Claude login of Cal, the starter, is gone, so the turn for Cal
    // cannot run until he connects Claude again (item 12 C of the mockups).
    'secret-late-reconnect': [
      ...history,
      ...outlived(
        countAsk,
        run(replicaRequest, 'late-allowed', {
          grant: allowedByPriya,
          delivery: { kind: 'reconnect', starter: 'cal', agent: 'claude' },
        }),
        waitsForReplica,
      ),
    ],
    'secret-late-denied': [
      ...history,
      ...outlivedBy('late-denied', { deniedBy: 'cal' }),
    ],
    // Cal archived the workspace while the request waited, so it ended
    // with no answer (item 3 A of the mockups).
    'secret-late-archived': [
      ...history,
      ...outlived(
        countAsk,
        run(replicaRequest, 'not-answered', { endedBy: 'archive' }),
        waitsForReplica,
      ),
    ],
    // The chat starts with this turn, because a chat with open folds starts
    // at its top, and the fold of the earlier turn would push it down.
    'secret-in-work': [
      ...countRan,
      { kind: 'turn-end', id: 'turn-end-count', duration: '38s', files: [] },
    ],
  }
}
