import { Input } from '@firna/ui/input'
import { agents, type AgentKey } from '../../fixtures/agents'
import {
  endpointApis,
  pastedKey,
  refusedEndpoint,
  typedEndpoints,
} from '../../fixtures/logins'
import { noop } from '../../../../../src/ui/noop'
import { useControlSizes } from '../../../../../src/ui/components/common/touch'
import { agentConnectCopy } from '../../../../../src/ui/components/settings/agentConnectCopy'
import styles from '../../../../../src/ui/components/settings/AgentConnectForm.module.css'

const copy = agentConnectCopy.endpoint

/**
 * What the endpoint field holds: nothing yet, an address that the shared
 * rule changes before the save, or an address that the rule refuses. With
 * an address, the key is in its field too, and it stays there after a
 * refusal.
 */
export type EndpointEntry = 'empty' | 'typed' | 'refused'

/** Names in a sentence, such as "A and B" or "A, B, and C". */
function listOf(names: readonly string[]): string {
  if (names.length < 3) return names.join(' and ')
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
}

/** The address in the field of each entry. */
function addressOf(agent: AgentKey, entry: EndpointEntry): string {
  switch (entry) {
    case 'empty':
      return ''
    case 'typed':
      return typedEndpoints[agent].typed
    case 'refused':
      return `${refusedEndpoint.origin}${endpointApis[agent].basePath}`
  }
}

/**
 * The hint under the address: where the requests go, through the gateway
 * of the app, from the address that the form saves, or from the example
 * while the field is empty. When the rule changes the typed address, the
 * hint first names the address that the form saves.
 */
function addressHint(agent: AgentKey, entry: EndpointEntry): string {
  const { requestPath } = endpointApis[agent]
  if (entry !== 'typed') {
    return copy.addressHint(`${copy.examples[agent]}${requestPath}`)
  }
  const { saved } = typedEndpoints[agent]
  return copy.addressHint(`${saved}${requestPath}`, saved)
}

/**
 * The fields of an own endpoint login: what the endpoint must serve, its
 * address, and its key. The text names the models that the picker offers,
 * because the app keeps its own model list. The app reads the model list of
 * the endpoint only to hide, from the pickers of the owner, each model that
 * the endpoint does not list. The hint of the address names the exact address
 * of the requests, which the gateway of the app sends to the endpoint. A
 * refusal of the address takes the place of that hint.
 */
export function EndpointFields(props: {
  agent: AgentKey
  entry: EndpointEntry
  keyHint: string
}) {
  const { field } = useControlSizes()
  const refused = props.entry === 'refused'
  const models = listOf(agents[props.agent].models.map((model) => model.name))
  return (
    <>
      <p className={styles.text}>{copy.serves(props.agent, models)}</p>
      <Input
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect={false}
        error={refused ? refusedEndpoint.cause : null}
        hint={refused ? undefined : addressHint(props.agent, props.entry)}
        inputMode="url"
        label={copy.addressLabel}
        onChangeText={noop}
        placeholder={copy.examples[props.agent]}
        size={field}
        value={addressOf(props.agent, props.entry)}
      />
      <Input
        autoComplete="off"
        hint={props.keyHint}
        label={copy.keyLabel}
        onChangeText={noop}
        placeholder={agentConnectCopy.key.placeholder}
        secureTextEntry
        size={field}
        value={props.entry === 'empty' ? '' : pastedKey}
      />
    </>
  )
}
