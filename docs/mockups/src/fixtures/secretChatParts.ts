/**
 * The parts of the chats of runs with secrets: the messages of Cal and of
 * the agent, the tool call of the agent and the run of its request in a
 * state, and the turn that a request outlived. `secretConversations.ts`
 * puts them together.
 */

import type { ChatItem, ToolCallItem } from './conversations'
import {
  cliCall,
  type LateAnswerItem,
  type MemberGrant,
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

/**
 * The tool call of the agent that runs a command with secrets, as the
 * runner reports it: one line with its target and its state, beside the
 * card of its run.
 */
export function call(
  request: SecretRequest,
  status: 'running' | 'done',
  id = 'secret-call',
): ToolCallItem {
  return { kind: 'tool', id, tool: 'run', target: cliCall(request), status }
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

export const allowedByCal: MemberGrant = { kind: 'session', by: 'cal' }

/** Priya allows a request of Cal later, in the session of Cal. */
export const allowedByPriya: MemberGrant = { kind: 'session', by: 'priya' }

/** The end of the turn that a request outlived. Nothing changed files. */
const lateEnd: ChatItem = {
  kind: 'turn-end',
  id: 'turn-end-late',
  duration: '2m 04s',
  files: [],
}

/**
 * The turn of a request that nobody answered in time: its tool call ended
 * without a run, the agent says what it waits for, and its turn ends. The
 * widget stays at its place.
 */
export function outlived(
  ask: readonly ChatItem[],
  widget: SecretRunItem,
  waits: string,
): ChatItem[] {
  return [
    ...ask,
    call(widget.request, 'done'),
    widget,
    agent('waits', waits),
    lateEnd,
  ]
}

export const waitsForReplica =
  'I asked for `PROD_DATABASE_URL`, and no one has answered yet. I will count the addresses when a member allows it.'

export const waitsForMapbox =
  'I asked for `MAPBOX_TOKEN`, and no one has answered yet. I will run the comparison when a member gives a value.'

/**
 * The line of a late Allow, which starts a turn for the sender of the
 * turn that asked (secrets decision 10 B).
 */
export function answerLine(
  request: SecretRequest,
  grant: MemberGrant,
): LateAnswerItem {
  return {
    kind: 'late-answer',
    id: 'late-answer',
    names: request.secrets.map((secret) => secret.name),
    grant,
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
  return [
    ...ask,
    call(request, 'running'),
    run(request, 'waiting', { draft }),
    working('31s'),
  ]
}

/** Priya gives the Mapbox token for each session of the workspace. */
export const givenForWorkspace: MemberGrant = {
  kind: 'value',
  lifetime: 'workspace',
  by: 'priya',
}
