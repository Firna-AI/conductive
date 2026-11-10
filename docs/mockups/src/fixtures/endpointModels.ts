import type { AgentChoice } from './agents'
import type { ChatItem } from './conversations'

/**
 * A model of the app that the model list of an own endpoint does not name:
 * its label in the picker, and the ID that the agent sends.
 */
type UnlistedModel = { label: string; id: string }

/**
 * The last read of the model list of an own endpoint that lacks models of
 * the app: those models, and when the read ran. A read that fails keeps the
 * last list and its time.
 */
export type ModelListCheck = {
  unlisted: readonly UnlistedModel[]
  checked: string
}

/** The Claude model that the list of Cal's proxy does not name. */
const fable: UnlistedModel = { label: 'Fable 5.1', id: 'claude-fable-5-1' }

/** The last read of the list of Cal's proxy for Claude. */
export const proxyModelCheck: ModelListCheck = {
  unlisted: [fable],
  checked: '4 minutes ago',
}

/**
 * The labels of the models that the picker marks in the sessions of Cal on
 * the proxy. The mark never blocks a choice, because the list of a gateway
 * need not name every model that it serves.
 */
export const unlistedLabels: readonly string[] = proxyModelCheck.unlisted.map(
  (model) => model.label,
)

/** The choice of a message on the model that the list does not name. */
export const unlistedChoice: AgentChoice = {
  agent: 'claude',
  model: fable.label,
  effort: 'high',
}

/**
 * The cause of a turn whose model the endpoint does not serve. It names the
 * model ID and no host, and every member of the org sees it.
 */
const notServed = `The endpoint of this login does not serve ${fable.id}. Choose another model.`

/**
 * The chat after Cal sent the next message on Fable 5.1, which the list of
 * the proxy does not name. The endpoint refused the model, so the turn
 * stopped before any work. `history` is the finished turn before it, and
 * `followUp` is the next message.
 */
export function endpointConversations(parts: {
  history: readonly ChatItem[]
  followUp: string
}) {
  return {
    'model-not-served': [
      ...parts.history,
      { kind: 'user', id: 'follow-up', text: parts.followUp },
      { kind: 'error', id: 'error', text: notServed },
    ],
  } as const satisfies Record<string, readonly ChatItem[]>
}
