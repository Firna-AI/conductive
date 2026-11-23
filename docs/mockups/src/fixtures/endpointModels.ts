import type {
  ModelListCheck,
  UnlistedModel,
} from '../../../../src/ui/components/settings/modelListCheck'
import type { AgentChoice } from './agents'
import type { ChatItem } from './conversations'

/** The Claude model that the list of Cal's proxy does not name. */
const fable: UnlistedModel = { label: 'Fable 5.1', id: 'claude-fable-5-1' }

/** The last read of the list of Cal's proxy for Claude. */
export const proxyModelCheck: ModelListCheck = {
  unlisted: [fable],
  checked: '4 minutes ago',
}

/**
 * The last Claude list of Cal's proxy that the app read, from the day
 * before the reads that failed. A failed read keeps the list and its time.
 */
export const keptModelCheck: ModelListCheck = {
  unlisted: [fable],
  checked: 'yesterday',
}

/**
 * The last read of the list of the gateway of Acme for Claude, the endpoint
 * of the org login of Acme. It lacks Fable 5.1 too.
 */
export const gatewayModelCheck: ModelListCheck = {
  unlisted: [fable],
  checked: '12 minutes ago',
}

/**
 * The labels of the models that a picker leaves out, because the list of
 * the endpoint does not name them: the pickers of Cal on his proxy, and the
 * pickers on the org login of Acme. A model that the endpoint serves but
 * does not list is left out too.
 */
export const unlistedLabels: readonly string[] = proxyModelCheck.unlisted.map(
  (model) => model.label,
)

/**
 * The choice of a session on the model that the list does not name. Cal
 * chose it while the list still named it, and a session keeps its current
 * model.
 */
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
 * the proxy no longer names. The endpoint refused the model, so the turn
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
