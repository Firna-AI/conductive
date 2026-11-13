/**
 * The parts of the chats of runs with secrets: the messages of Cal and of
 * the agent, the run of a request in a state, and the turn that a request
 * outlived. `secretConversations.ts` puts them together.
 */

import { lateAnswerMessage } from '../components/chat/secretRunCopy'
import type { ChatItem } from './conversations'
import { orgs } from './orgs'
import {
  replicaOutput,
  type SecretGrant,
  type SecretRequest,
  type SecretRunItem,
  type ValueLifetime,
} from './secretRequests'

/** A run of one request in a state, at the place of its first run. */
export function run(
  request: SecretRequest,
  state: SecretRunItem['state'],
  extra: Partial<SecretRunItem> = {},
): SecretRunItem {
  return { kind: 'secret-run', id: 'secret-run', request, state, ...extra }
}

export function agent(id: string, text: string): ChatItem {
  return { kind: 'agent', id, blocks: [text] }
}

export function working(elapsed: string): ChatItem {
  return { kind: 'working', id: 'working', elapsed }
}

/** Cal asks for a count that needs the production replica. */
export const countAsk: readonly ChatItem[] = [
  {
    kind: 'user',
    id: 'ask-count',
    text: 'How many saved addresses in production have no postcode? That sizes the manual fallback.',
  },
  agent(
    'plan-count',
    "I'll count them on the read-only replica of the production database.",
  ),
]

/** Cal asks for a comparison that needs a token that Acme does not have. */
export const compareAsk: readonly ChatItem[] = [
  {
    kind: 'user',
    id: 'ask-compare',
    text: 'Compare the suggestions of the places proxy with Mapbox for our checkout addresses.',
  },
  agent(
    'plan-compare',
    'Acme has no Mapbox token yet, so I asked for one to run the comparison.',
  ),
]

export const counted = agent(
  'counted',
  '1,284 of the 41,902 saved addresses in production have no postcode, which is 3.1%. The manual fallback stays under the suggestions.',
)

export const compared = agent(
  'compared',
  'Mapbox gives the same first suggestion as the places proxy for 182 of the 200 addresses. The places proxy stays.',
)

export const allowedByCal: SecretGrant = { kind: 'session', by: 'cal' }

export const replicaDone = { duration: '4s', output: replicaOutput }

/** The end of the turn that a request outlived. Nothing changed files. */
const lateEnd: ChatItem = {
  kind: 'turn-end',
  id: 'turn-end-late',
  duration: '2m 04s',
  files: [],
}

/**
 * The turn of a request that nobody answered in time: the agent says what
 * it waits for, and its turn ends. The widget stays at its place.
 */
export function outlived(
  ask: readonly ChatItem[],
  widget: SecretRunItem,
  waits: string,
): ChatItem[] {
  return [...ask, widget, agent('waits', waits), lateEnd]
}

export const waitsForReplica =
  'I asked for `PROD_DATABASE_URL`, and no one has answered yet. I will count the addresses when a member allows it.'

export const waitsForMapbox =
  'I asked for `MAPBOX_TOKEN`, and no one has answered yet. I will run the comparison when a member gives a value.'

/** The message of a late answer, in the name of the member who answered. */
export function answerMessage(
  request: SecretRequest,
  grant: SecretGrant,
): ChatItem {
  return {
    kind: 'user',
    id: 'late-answer',
    text: lateAnswerMessage(
      request.secrets.map((secret) => secret.name),
      grant,
      orgs.acme.name,
    ),
  }
}

/**
 * A request that asks for a value and waits, with its drawn answer: a
 * value typed or not, and the chosen lifetime.
 */
export function valueAsk(
  ask: readonly ChatItem[],
  request: SecretRequest,
  draft: { typed: boolean; lifetime: ValueLifetime },
): ChatItem[] {
  return [...ask, run(request, 'waiting', { draft }), working('31s')]
}

/** Priya gives the Mapbox token for each session of the workspace. */
export const givenForWorkspace: SecretGrant = {
  kind: 'value',
  lifetime: 'workspace',
  by: 'priya',
}
