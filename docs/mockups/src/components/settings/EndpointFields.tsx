import { Input } from '@firna/ui/input'
import { productName } from '../../brand'
import { agents, type AgentKey } from '../../fixtures/agents'
import {
  endpointApis,
  exampleEndpointOrigin,
  pastedKey,
  refusedEndpoint,
} from '../../fixtures/logins'
import { noop } from '../../noop'
import { useControlSizes } from '../common/touch'
import styles from './AgentConnectForm.module.css'

/**
 * What the endpoint field holds: nothing yet, or an `http://` address that
 * the save refused, because its host is not a loopback name. After the
 * refusal the key stays in its field.
 */
export type EndpointEntry = 'empty' | 'refused'

/** The form of the address of each agent, which the hint of its field gives. */
const addressRules: Readonly<Record<AgentKey, string>> = {
  claude: 'Without /v1, a query, or a fragment.',
  codex: 'Ending in /v1, without a query or a fragment.',
}

/** Names in a sentence, such as "A and B" or "A, B, and C". */
function listOf(names: readonly string[]): string {
  if (names.length < 3) return names.join(' and ')
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
}

/**
 * The fields of an own endpoint login: what the endpoint must serve, its
 * address, and its key. The endpoint must serve the models that the picker
 * offers, because the app keeps its own model list and never calls the
 * endpoint. The hint of the address names where the agent program sends
 * its requests, from the address in the field, or from the example while
 * the field is empty. It names the cloud computer as the sender, so that a
 * loopback address reads as a proxy on the cloud computer. A refusal of
 * the address takes the place of that hint.
 */
export function EndpointFields(props: {
  agent: AgentKey
  entry: EndpointEntry
  keyHint: string
}) {
  const { field } = useControlSizes()
  const api = endpointApis[props.agent]
  const refused = props.entry === 'refused'
  const example = `${exampleEndpointOrigin}${api.basePath}`
  const address = refused ? `${refusedEndpoint.origin}${api.basePath}` : ''
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
        hint={
          refused
            ? undefined
            : `${addressRules[props.agent]} Requests go from the cloud computer to ${example}${api.requestPath}.`
        }
        inputMode="url"
        label="Endpoint"
        onChangeText={noop}
        placeholder={example}
        size={field}
        value={address}
      />
      <Input
        autoComplete="off"
        hint={props.keyHint}
        label="API key"
        onChangeText={noop}
        placeholder="Paste the key"
        secureTextEntry
        size={field}
        value={refused ? pastedKey : ''}
      />
    </>
  )
}
