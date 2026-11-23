import { Input } from '@firna/ui/input'
import type { Agent } from '../../shared/generated/Agent'
import { productName } from '../../shared/brand'
import { useControlSizes } from '../../ui/components/common/touch'
import { agentConnectCopy } from '../../ui/components/settings/agentConnectCopy'
import styles from '../../ui/components/settings/AgentConnectForm.module.css'
import type { ApiError } from '../../app/api/client'
import type { SecretForm } from '../../app/secret-form'
import { useStore } from '../../app/store'
import { ENDPOINT_ADDRESS_ERROR } from '../../shared/endpoint-address'
import { ExternalLink } from '../ui/links'
import type { LoginKind } from './labels'

const { endpoint, key, token } = agentConnectCopy

/** The agent login API stores the secret without a test of it. */
const keepHint = `${productName} keeps it encrypted, and never shows it again.`

/**
 * Whether a failed save refused the address of an own endpoint. The form
 * shows that refusal at the address, not at the key.
 */
export function refusesAddress(error: ApiError | null): boolean {
  return error?.code === ENDPOINT_ADDRESS_ERROR.code
}

/** The field of the secret, by the agent and the kind of its login. */
function fieldOf(agent: Agent, kind: LoginKind) {
  if (kind === 'endpoint') {
    return { label: endpoint.keyLabel, placeholder: key.placeholder }
  }
  if (agent === 'codex' || kind === 'api-key') {
    return { label: key.label(agent), placeholder: key.placeholder }
  }
  return { label: token.label, placeholder: token.placeholder }
}

/**
 * What to paste for a token or an API key, and where the user gets it. The
 * key of an org login comes from the account of `org`, such as "Acme's".
 */
export function SecretText(props: {
  agent: Agent
  kind: LoginKind
  org?: string
}) {
  const whose =
    props.org === undefined ? key.whose.own : key.whose.org(props.org)
  if (props.agent === 'codex' || props.kind === 'api-key') {
    return (
      <p className={styles.text}>
        {key.text(props.agent, whose)}{' '}
        <ExternalLink href={key.pages[props.agent]}>
          {key.link(props.agent)}
        </ExternalLink>
      </p>
    )
  }
  return (
    <p className={styles.text}>
      {token.before} <code className={styles.code}>{token.command}</code>{' '}
      {token.after}
    </p>
  )
}

/** The field of a secret. A pasted secret shows only as dots. */
export function SecretField(props: {
  form: SecretForm
  agent: Agent
  kind: LoginKind
  submit: () => void
}) {
  const { field } = useControlSizes()
  const value = useStore(props.form.value)
  const state = useStore(props.form.state)
  const { label, placeholder } = fieldOf(props.agent, props.kind)
  return (
    <Input
      autoComplete="off"
      editable={!state.saving}
      error={state.missing ? `${placeholder} first.` : null}
      hint={keepHint}
      invalid={state.error !== null && !refusesAddress(state.error)}
      label={label}
      onChangeText={(text) => props.form.set(text)}
      onSubmitEditing={props.submit}
      placeholder={placeholder}
      secureTextEntry
      size={field}
      value={value}
    />
  )
}
