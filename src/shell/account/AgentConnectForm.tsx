import { useState } from 'react'
import { Input } from '@firna/ui/input'
import { SegmentedControl } from '@firna/ui/segmented'
import { TriangleAlert } from 'lucide-react'
import { productName } from '../../../docs/mockups/src/brand'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import styles from '../../../docs/mockups/src/components/settings/AgentConnectForm.module.css'
import { SecretForm } from '../../app/secret-form'
import { useStore } from '../../app/store'
import type { SaveAgentLoginRequest } from '../../shared/account'
import type { Agent } from '../../shared/agents'
import { useApp } from '../context'
import { ActionButton } from '../ui/actions'
import { ExternalLink } from '../ui/links'
import { agentNames, loginLabels, type LoginKind } from './labels'

/** The pages where a user makes an API key for Claude and for Codex. */
const keyPages = {
  anthropic: 'https://console.anthropic.com/settings/keys',
  openAi: 'https://platform.openai.com/api-keys',
} as const

/** The agent login API stores the secret without a test of it. */
const keepHint = `${productName} keeps it encrypted, and never shows it again.`

const claudeKinds: readonly LoginKind[] = ['token', 'api-key']

function loginRequest(
  agent: Agent,
  kind: LoginKind,
  secret: string,
): SaveAgentLoginRequest {
  if (agent === 'claude') return { agent, kind, secret }
  return { agent, kind: 'api-key', secret }
}

/** The field of the secret, by the agent and the kind of its login. */
function fieldOf(agent: Agent, kind: LoginKind) {
  if (agent === 'codex') {
    return { label: 'OpenAI API key', placeholder: 'Paste the key' }
  }
  if (kind === 'api-key') {
    return { label: 'Anthropic API key', placeholder: 'Paste the key' }
  }
  return { label: loginLabels.token, placeholder: 'Paste the token' }
}

/** What to paste, and where the user gets it. */
function SecretText(props: { agent: Agent; kind: LoginKind }) {
  if (props.agent === 'codex') {
    return (
      <p className={styles.text}>
        Paste an API key of your OpenAI account.{' '}
        <ExternalLink href={keyPages.openAi}>Make one on OpenAI</ExternalLink>
      </p>
    )
  }
  if (props.kind === 'api-key') {
    return (
      <p className={styles.text}>
        Paste an API key of your Anthropic account.{' '}
        <ExternalLink href={keyPages.anthropic}>
          Make one on Anthropic
        </ExternalLink>
      </p>
    )
  }
  return (
    <p className={styles.text}>
      Run <code className={styles.code}>claude setup-token</code> on your
      computer, then paste the token that it prints.
    </p>
  )
}

/** The field of a secret. A pasted secret shows only as dots. */
function SecretField(props: {
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
      invalid={state.error !== null}
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

/**
 * The form that connects an agent, open under its row: Claude with a
 * subscription token or an API key, and Codex with an OpenAI API key. The
 * secret leaves the browser once, in the save. A failed save keeps the
 * secret in the field and shows why. Cancel shows when `close` is set.
 */
export function AgentConnectForm(props: {
  agent: Agent
  close?: () => void
  connected: () => void
}) {
  const app = useApp()
  const { field } = useControlSizes()
  const [form] = useState(() => new SecretForm())
  const [kind, setKind] = useState<LoginKind>(
    props.agent === 'claude' ? 'token' : 'api-key',
  )
  const state = useStore(form.state)
  const submit = () => {
    void form
      .submit((secret) =>
        app.account.saveLogin(loginRequest(props.agent, kind, secret)),
      )
      .then((saved) => {
        if (saved) props.connected()
      })
  }
  return (
    <div className={styles.form}>
      {props.agent === 'claude' ? (
        <SegmentedControl
          accessibilityLabel="Connect with"
          disabled={state.saving}
          onChange={setKind}
          options={claudeKinds.map((item) => ({
            label: loginLabels[item],
            value: item,
          }))}
          size={field}
          value={kind}
        />
      ) : null}
      <SecretText agent={props.agent} kind={kind} />
      <SecretField
        agent={props.agent}
        form={form}
        kind={kind}
        submit={submit}
      />
      {state.error ? (
        <Notice
          body={state.error.message}
          icon={TriangleAlert}
          title={`${agentNames[props.agent]} wasn't connected`}
          tone="danger"
        />
      ) : null}
      <div className={styles.actions}>
        {props.close ? (
          <ActionButton disabled={state.saving} onPress={props.close}>
            Cancel
          </ActionButton>
        ) : null}
        <ActionButton busy={state.saving} onPress={submit} tone="primary">
          Connect
        </ActionButton>
      </div>
    </div>
  )
}
