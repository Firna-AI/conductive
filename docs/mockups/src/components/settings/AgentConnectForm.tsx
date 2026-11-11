import { Input } from '@firna/ui/input'
import { SegmentedControl } from '@firna/ui/segmented'
import { productName } from '../../brand'
import type { AgentKey } from '../../fixtures/agents'
import {
  agentLoginKinds,
  claudeTokenCommand,
  loginLabels,
  openAiKeyPage,
  type LoginKind,
} from '../../fixtures/logins'
import { noop } from '../../noop'
import { ActionButton } from '../common/actions'
import { ExternalLink } from '../common/ExternalLink'
import { ScreenLink } from '../common/ScreenLink'
import { useControlSizes } from '../common/touch'
import { EndpointFields, type EndpointEntry } from './EndpointFields'
import styles from './AgentConnectForm.module.css'

/** The hint of a subscription token or an API key. */
const testHint = `${productName} tests it once, and never shows it again.`

/**
 * The hint of the key of an own endpoint. The save reads the model list of
 * the endpoint, but a failed read does not fail the save. So this hint
 * promises no test.
 */
const keepHint = `${productName} keeps it encrypted, and never shows it again.`

/**
 * The kinds of the agent, with the kind of the form chosen. On a phone the
 * three kinds of Claude wrap onto a second line.
 */
function KindChoice(props: { agent: AgentKey; kind: LoginKind }) {
  const { field } = useControlSizes()
  return (
    <SegmentedControl
      accessibilityLabel="Connect with"
      onChange={noop}
      options={agentLoginKinds[props.agent].map((kind) => ({
        label: loginLabels[kind],
        value: kind,
      }))}
      size={field}
      value={props.kind}
      wrap
    />
  )
}

function TokenFields() {
  const { field } = useControlSizes()
  return (
    <>
      <p className={styles.text}>
        Run <code className={styles.code}>{claudeTokenCommand}</code> on your
        computer, then paste the token that it prints.
      </p>
      <Input
        autoComplete="off"
        hint={testHint}
        label="Subscription token"
        onChangeText={noop}
        placeholder="Paste the token"
        secureTextEntry
        size={field}
        value=""
      />
    </>
  )
}

function OpenAiKeyFields() {
  const { field } = useControlSizes()
  return (
    <>
      <p className={styles.text}>
        Paste an API key of your OpenAI account.{' '}
        <ExternalLink href={openAiKeyPage}>Make one on OpenAI</ExternalLink>
      </p>
      <Input
        autoComplete="off"
        hint={testHint}
        label="OpenAI API key"
        onChangeText={noop}
        placeholder="Paste the key"
        secureTextEntry
        size={field}
        value=""
      />
    </>
  )
}

/**
 * The fields of the kind of the form: the own endpoint with what its
 * address field holds, or else the first kind of the agent.
 */
function KindFields(props: { agent: AgentKey; endpoint?: EndpointEntry }) {
  if (props.endpoint) {
    return (
      <EndpointFields
        agent={props.agent}
        entry={props.endpoint}
        keyHint={keepHint}
      />
    )
  }
  return props.agent === 'claude' ? <TokenFields /> : <OpenAiKeyFields />
}

/**
 * The form that connects an agent, open under its row: Claude with a
 * subscription token, an API key, or an own endpoint, and Codex with an
 * OpenAI API key or an own endpoint. Without `endpoint`, the form shows the
 * first kind of the agent. With it, the form shows the own endpoint kind
 * and what its address field holds. Connect leads to `connectTo`. Cancel
 * shows when the form can close.
 */
export function AgentConnectForm(props: {
  agent: AgentKey
  connectTo: string
  cancel: boolean
  endpoint?: EndpointEntry
}) {
  const [firstKind] = agentLoginKinds[props.agent]
  return (
    <div className={styles.form}>
      <KindChoice
        agent={props.agent}
        kind={props.endpoint ? 'endpoint' : firstKind}
      />
      <KindFields agent={props.agent} endpoint={props.endpoint} />
      <div className={styles.actions}>
        {props.cancel ? <ActionButton>Cancel</ActionButton> : null}
        <ScreenLink asChild to={props.connectTo}>
          <ActionButton tone="primary">Connect</ActionButton>
        </ScreenLink>
      </div>
    </div>
  )
}
