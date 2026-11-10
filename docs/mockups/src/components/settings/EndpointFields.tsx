import { Input } from '@firna/ui/input'
import { productName } from '../../brand'
import { agents, type AgentKey } from '../../fixtures/agents'
import {
  endpointApis,
  exampleEndpointOrigin,
  pastedKey,
  refusedEndpoint,
  typedEndpoints,
} from '../../fixtures/logins'
import { noop } from '../../noop'
import { useControlSizes } from '../common/touch'
import styles from './AgentConnectForm.module.css'

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
  const api = endpointApis[agent]
  const requests = (base: string) =>
    `Requests go through ${productName} to ${base}${api.requestPath}.`
  if (entry !== 'typed') {
    return requests(`${exampleEndpointOrigin}${api.basePath}`)
  }
  const { saved } = typedEndpoints[agent]
  return `Saves as ${saved}. ${requests(saved)}`
}

/**
 * The fields of an own endpoint login: what the endpoint must serve, its
 * address, and its key. The endpoint must serve the models that the picker
 * offers, because the app keeps its own model list and does not read the
 * models of the endpoint. The hint of the address names the exact address
 * of the requests, which the gateway of the app sends to the endpoint. A
 * refusal of the address takes the place of that hint.
 */
export function EndpointFields(props: {
  agent: AgentKey
  entry: EndpointEntry
  keyHint: string
}) {
  const { field } = useControlSizes()
  const api = endpointApis[props.agent]
  const refused = props.entry === 'refused'
  const models = listOf(agents[props.agent].models.map((model) => model.name))
  return (
    <>
      <p className={styles.text}>
        Use a gateway or a proxy that serves {api.name}, with the models that{' '}
        {productName} offers: {models}.
      </p>
      <Input
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect={false}
        error={refused ? refusedEndpoint.cause : null}
        hint={refused ? undefined : addressHint(props.agent, props.entry)}
        inputMode="url"
        label="Endpoint"
        onChangeText={noop}
        placeholder={`${exampleEndpointOrigin}${api.basePath}`}
        size={field}
        value={addressOf(props.agent, props.entry)}
      />
      <Input
        autoComplete="off"
        hint={props.keyHint}
        label="API key"
        onChangeText={noop}
        placeholder="Paste the key"
        secureTextEntry
        size={field}
        value={props.entry === 'empty' ? '' : pastedKey}
      />
    </>
  )
}
