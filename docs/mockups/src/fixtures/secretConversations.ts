import type { ChatItem } from './conversations'
import {
  agent,
  allowedByCal,
  answerMessage,
  compareAsk,
  compared,
  countAsk,
  counted,
  outlived,
  replicaDone,
  run,
  waitsForReplica,
  working,
} from './secretChatParts'
import {
  iconsRequest,
  mapboxOutput,
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
  'secret-late-denied',
  'secret-late-archived',
  'secret-in-work',
] as const

type SecretConversationKey = (typeof secretConversationKeys)[number]

/**
 * The chats of a run with secrets of the org (secrets decisions 1 and 4),
 * after the finished turn of `history`: a request that waits, its results,
 * and a request that outlived its tool call. The run in the open work of
 * its turn starts the chat instead. `secretValueConversations.ts` holds
 * the requests that ask for a value.
 */
export function secretConversations(
  history: readonly ChatItem[],
): Record<SecretConversationKey, readonly ChatItem[]> {
  const late = outlived(countAsk, run(replicaRequest, 'late'), waitsForReplica)
  const allowedLate = outlived(
    countAsk,
    run(replicaRequest, 'late-allowed', { grant: allowedByCal }),
    waitsForReplica,
  )
  return {
    'secret-waiting': [
      ...history,
      ...countAsk,
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
      run(previewRequest, 'waiting'),
      working('19s'),
    ],
    'secret-running': [
      ...history,
      ...countAsk,
      run(replicaRequest, 'running', { grant: allowedByCal }),
      working('41s'),
    ],
    'secret-done': [
      ...history,
      ...countAsk,
      run(replicaRequest, 'done', { grant: allowedByCal, result: replicaDone }),
      counted,
    ],
    'secret-denied': [
      ...history,
      ...countAsk,
      run(replicaRequest, 'denied', { deniedBy: 'cal' }),
      agent(
        'without-replica',
        "I can't count them without the replica. The test data has made-up addresses, so it can't size the fallback.",
      ),
    ],
    'secret-pre-approved': [
      ...history,
      {
        kind: 'user',
        id: 'ask-icons',
        text: 'Export the new address icons from the checkout designs.',
      },
      agent('plan-icons', "I'll export them from Figma."),
      run(iconsRequest, 'done', {
        grant: { kind: 'pre-approved' },
        result: {
          duration: '6s',
          output: 'Exported 4 icons to src/app/checkout/icons',
        },
      }),
      agent(
        'icons-done',
        'I exported the 4 address icons into `src/app/checkout/icons`.',
      ),
    ],
    'secret-value': [
      ...history,
      ...compareAsk,
      run(mapboxRequest, 'done', {
        grant: { kind: 'value', lifetime: 'minutes', by: 'cal' },
        result: { duration: '12s', output: mapboxOutput },
      }),
      compared,
    ],
    'secret-late': [...history, ...late],
    'secret-late-allowed': [
      ...history,
      ...allowedLate,
      answerMessage(replicaRequest, allowedByCal),
      working('6s'),
    ],
    'secret-late-ran': [
      ...history,
      ...allowedLate,
      answerMessage(replicaRequest, allowedByCal),
      {
        ...run(replicaRequest, 'done', {
          grant: allowedByCal,
          result: replicaDone,
        }),
        id: 'secret-run-again',
      },
      counted,
    ],
    'secret-late-denied': [
      ...history,
      ...outlived(
        countAsk,
        run(replicaRequest, 'late-denied', { deniedBy: 'cal' }),
        waitsForReplica,
      ),
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
      ...countAsk,
      run(replicaRequest, 'done', { grant: allowedByCal, result: replicaDone }),
      counted,
      { kind: 'turn-end', id: 'turn-end-count', duration: '38s', files: [] },
    ],
  }
}
