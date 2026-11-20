import type { AgentKey } from './agents'
import {
  autocompletePullRequest,
  cutOffTurn,
  e2eRunning,
} from './autocompleteTurn'
import type { ChatItem } from './conversations'
import { changedFiles } from './files'
import { bullets } from './listConversations'
import type { KeptLogin } from './secretRequests'

/**
 * The line of the app after a turn that the cloud computer stopped while
 * the agent worked, when no member and no part of the app asked for the
 * stop. The stopped line of that turn names the cause. This line says what
 * comes next: a continuation turn, which starts at the line, or no turn.
 * With no turn, `reconnect` names the login of the session, which is gone,
 * and `message` asks for a message.
 */
export type TurnContinuedItem = {
  kind: 'turn-continued'
  id: string
  next:
    | { kind: 'turn' }
    | { kind: 'reconnect'; login: KeptLogin; agent: AgentKey }
    | { kind: 'message' }
}

/** The end of a turn that the cloud computer stopped. It names no member. */
const stoppedByComputer = {
  kind: 'stopped',
  id: 'stopped',
  endReason: 'cloud_computer_stopped',
} as const satisfies ChatItem

function continued(id: string, next: TurnContinuedItem['next']): ChatItem {
  return { kind: 'turn-continued', id, next }
}

/**
 * The first message of the agent in a continuation turn. The app told the
 * agent about the stop in a message that the chat does not show.
 */
const rerun: ChatItem = {
  kind: 'agent',
  id: 'rerun',
  blocks: [
    "The end-to-end run ended when the cloud computer stopped. I'll run it again.",
  ],
}

/**
 * The continuation turn: the agent runs the end-to-end tests again, updates
 * the README, opens pull request #482, and replies. The turn changed only
 * the README, so its end lists that file. Changes lists each change of the
 * branch.
 */
const continuationTurn: readonly ChatItem[] = [
  rerun,
  { ...e2eRunning, id: 'e2e-again', detail: '3 passed', status: 'done' },
  ...autocompletePullRequest.filter((item) => item.id !== 'e2e'),
  {
    kind: 'agent',
    id: 'done',
    blocks: [
      'Done. Checkout now suggests addresses as you type.',
      bullets(
        'Choosing a suggestion fills the street, city, and postcode.',
        'Manual entry still works when there is no match.',
        'I ran the end-to-end tests again after the stop, and they pass.',
        'Opened pull request #482.',
      ),
    ],
  },
  {
    kind: 'turn-end',
    id: 'turn-end',
    duration: '2m 38s',
    files: changedFiles.filter((file) => file.path === 'README.md'),
  },
]

/** The turn up to the end-to-end run that the stop cut off, and its end. */
const stopped: readonly ChatItem[] = [...cutOffTurn, stoppedByComputer]

/** The line of a continuation turn that waits for the start. */
const waits = continued('continued', { kind: 'turn' })

/**
 * The chats of a turn that the cloud computer stopped while the agent
 * worked. `sandbox-stopped` ends at the line of the continuation turn,
 * which waits for the start. In `cloud-computer-continued` that turn ran.
 * With the login of the session gone, no turn waits. In
 * `cloud-computer-stopped-again`, the cloud computer stopped the
 * continuation turn a few minutes after its start, so no further turn
 * waits.
 */
export const continuationConversations = {
  'sandbox-stopped': [...stopped, waits],
  'cloud-computer-continued': [...stopped, waits, ...continuationTurn],
  'cloud-computer-login-gone': [
    ...stopped,
    continued('continued', {
      kind: 'reconnect',
      login: { type: 'personal', starter: 'cal' },
      agent: 'claude',
    }),
  ],
  'cloud-computer-org-login-gone': [
    ...stopped,
    continued('continued', {
      kind: 'reconnect',
      login: { type: 'org' },
      agent: 'claude',
    }),
  ],
  'cloud-computer-stopped-again': [
    ...stopped,
    waits,
    rerun,
    { ...e2eRunning, id: 'e2e-again', status: 'stopped' },
    { ...stoppedByComputer, id: 'stopped-again' },
    continued('continued-again', { kind: 'message' }),
  ],
} as const satisfies Record<string, readonly ChatItem[]>
