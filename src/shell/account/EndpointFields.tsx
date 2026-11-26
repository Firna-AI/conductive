import { Input } from '@firna/ui/input'
import type { Agent } from '../../shared/generated/Agent'
import { useControlSizes } from '../../ui/components/common/touch'
import { agentConnectCopy } from '../../ui/components/settings/agentConnectCopy'
import styles from '../../ui/components/settings/AgentConnectForm.module.css'
import type { SecretForm } from '../../app/secret-form'
import { useStore } from '../../app/store'
import {
  ENDPOINT_ADDRESS_ERROR,
  readEndpointAddress,
} from '../../shared/endpoint-address'
import { useApp } from '../context'
import { SecretField } from './SecretFields'

const copy = agentConnectCopy.endpoint

/**
 * The route that the gateway of the app adds to the base address of the
 * endpoint of each agent for each request. A Claude base has no `/v1`, and
 * a Codex base ends with it.
 */
const requestRoutes = {
  claude: '/v1/messages',
  codex: '/responses',
} as const satisfies Record<Agent, string>

/** Names in a sentence, such as "A", "A and B", or "A, B, and C". */
const names = new Intl.ListFormat('en', { type: 'conjunction' })

/** What the endpoint must serve, with the models of the app for the agent. */
function servesText(agent: Agent, labels: readonly string[]): string {
  return copy.serves(
    agent,
    labels.length > 0 ? names.format(labels) : undefined,
  )
}

/**
 * The hint under the address: where the requests of the agent go, through
 * the gateway of the app. It follows the typed address from the moment that
 * the shared rule accepts it, and shows the example until then. When the
 * rule changes the typed address, the hint first names the address that
 * the form saves.
 */
function addressHint(agent: Agent, typed: string): string {
  const route = requestRoutes[agent]
  const address = readEndpointAddress(typed, agent, { route })
  if (!address) return copy.addressHint(`${copy.examples[agent]}${route}`)
  const saved = address.endpoint === typed.trim() ? undefined : address.endpoint
  return copy.addressHint(address.upstream, saved)
}

/**
 * Why the form keeps an address from the save: an empty field, or an
 * address that the shared rule of the save refuses. Null when the rule
 * accepts it.
 */
export function addressProblem(agent: Agent, typed: string): string | null {
  if (typed.trim() === '') return 'Enter the endpoint first.'
  if (readEndpointAddress(typed, agent)) return null
  return ENDPOINT_ADDRESS_ERROR.message
}

/**
 * The fields of an own endpoint login: what the endpoint must serve, with
 * the models that the app offers, its address, and its key. The hint of the
 * address names the exact address of the requests, and a refusal of the
 * address takes the place of that hint. `form` holds the key.
 */
export function EndpointFields(props: {
  agent: Agent
  form: SecretForm
  address: string
  refusal: string | null
  changeAddress: (address: string) => void
  submit: () => void
}) {
  const app = useApp()
  const models = useStore(app.models)
  const state = useStore(props.form.state)
  const { field } = useControlSizes()
  const labels = models
    .filter((model) => model.agent === props.agent)
    .map((model) => model.label)
  return (
    <>
      <p className={styles.text}>{servesText(props.agent, labels)}</p>
      <Input
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect={false}
        editable={!state.saving}
        error={props.refusal}
        hint={
          props.refusal ? undefined : addressHint(props.agent, props.address)
        }
        inputMode="url"
        label={copy.addressLabel}
        onChangeText={props.changeAddress}
        onSubmitEditing={props.submit}
        placeholder={copy.examples[props.agent]}
        size={field}
        value={props.address}
      />
      <SecretField
        agent={props.agent}
        form={props.form}
        kind="endpoint"
        submit={props.submit}
      />
    </>
  )
}
