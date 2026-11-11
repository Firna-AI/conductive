import { useState, type ReactNode } from 'react'
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
import { ChatGptSignIn } from './ChatGptSignIn'
import { agentNames, loginLabels, type LoginKind } from './labels'

/** The pages where a user makes the secret of a login. */
const secretPages = {
  anthropicKey: 'https://console.anthropic.com/settings/keys',
  openAiKey: 'https://platform.openai.com/api-keys',
} as const

/** The agent login API stores the secret without a test of it. */
const keepHint = `${productName} keeps it encrypted, and never shows it again.`

/**
 * The kinds of each agent in the order of the switch of its form. The first
 * kind starts selected. An OpenAI API key needs no step before it, and the
 * ChatGPT sign-in needs a setting of ChatGPT first, so the API key comes
 * first for Codex.
 */
const connectKinds: Readonly<
  Record<Agent, readonly [LoginKind, ...LoginKind[]]>
> = {
  claude: ['token', 'api-key'],
  codex: ['api-key', 'token'],
}

/** The agent and the kind that the save of a secret sends, as one pair. */
type SecretLogin = SaveAgentLoginRequest extends infer Save
  ? Save extends SaveAgentLoginRequest
    ? Omit<Save, 'secret'>
    : never
  : never

/**
 * A secret to paste: the login that its save names, the words that say what
 * to paste and where to get it, then the label and the placeholder of the
 * field.
 */
type SecretAsk = {
  type: 'secret'
  login: SecretLogin
  text: ReactNode
  label: string
  placeholder: string
}

/** What a form asks for: a secret, or the ChatGPT sign-in, with no field. */
type Ask = SecretAsk | { type: 'chatgpt-sign-in' }

/** What each agent asks for, by the kind that the switch selects. */
const asks: Readonly<Record<Agent, Readonly<Record<LoginKind, Ask>>>> = {
  claude: {
    token: {
      type: 'secret',
      login: { agent: 'claude', kind: 'token' },
      text: (
        <>
          Run <code className={styles.code}>claude setup-token</code> on your
          computer, then paste the token that it prints.
        </>
      ),
      label: 'Subscription token',
      placeholder: 'Paste the token',
    },
    'api-key': {
      type: 'secret',
      login: { agent: 'claude', kind: 'api-key' },
      text: (
        <>
          Paste an API key of your Anthropic account.{' '}
          <ExternalLink href={secretPages.anthropicKey}>
            Make one on Anthropic
          </ExternalLink>
        </>
      ),
      label: 'Anthropic API key',
      placeholder: 'Paste the key',
    },
  },
  codex: {
    'api-key': {
      type: 'secret',
      login: { agent: 'codex', kind: 'api-key' },
      text: (
        <>
          Paste an API key of your OpenAI account.{' '}
          <ExternalLink href={secretPages.openAiKey}>
            Make one on OpenAI
          </ExternalLink>
        </>
      ),
      label: 'OpenAI API key',
      placeholder: 'Paste the key',
    },
    token: { type: 'chatgpt-sign-in' },
  },
}

/** The field of a secret. A pasted secret shows only as dots. */
function SecretField(props: {
  form: SecretForm
  ask: SecretAsk
  submit: () => void
}) {
  const { field } = useControlSizes()
  const value = useStore(props.form.value)
  const state = useStore(props.form.state)
  const { label, placeholder } = props.ask
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
 * The words, the field, and the buttons of a secret. The secret leaves the
 * browser once, in the save, with the chosen kind. A failed save keeps the
 * secret in the field and shows why.
 */
function SecretFields(props: {
  ask: SecretAsk
  form: SecretForm
  close?: () => void
  connected: () => void
}) {
  const app = useApp()
  const state = useStore(props.form.state)
  const submit = () => {
    void props.form
      .submit((secret) => app.account.saveLogin({ ...props.ask.login, secret }))
      .then((saved) => {
        if (saved) props.connected()
      })
  }
  return (
    <>
      <p className={styles.text}>{props.ask.text}</p>
      <SecretField ask={props.ask} form={props.form} submit={submit} />
      {state.error ? (
        <Notice
          body={state.error.message}
          icon={TriangleAlert}
          title={`${agentNames[props.ask.login.agent]} wasn't connected`}
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
    </>
  )
}

/**
 * The form that connects an agent, open under its row. Its switch chooses
 * the kind of the login: a subscription token or an API key for Claude,
 * and an API key or the ChatGPT plan for Codex. `kind` starts selected, by
 * default the first kind of the agent. A secret has its field and Connect.
 * The ChatGPT plan has the steps of its sign-in, which another kind stops.
 * Cancel shows when `close` is set. `connected` runs after a save or a
 * sign-in.
 */
export function AgentConnectForm(props: {
  agent: Agent
  kind?: LoginKind
  close?: () => void
  connected: () => void
}) {
  const { field } = useControlSizes()
  const [form] = useState(() => new SecretForm())
  const kinds = connectKinds[props.agent]
  const [kind, setKind] = useState<LoginKind>(props.kind ?? kinds[0])
  const state = useStore(form.state)
  const ask = asks[props.agent][kind]
  return (
    <div className={styles.form}>
      <SegmentedControl
        accessibilityLabel="Connect with"
        disabled={state.saving}
        onChange={setKind}
        options={kinds.map((item) => ({
          label: loginLabels[props.agent][item],
          value: item,
        }))}
        size={field}
        value={kind}
      />
      {ask.type === 'secret' ? (
        <SecretFields
          ask={ask}
          close={props.close}
          connected={props.connected}
          form={form}
        />
      ) : (
        <ChatGptSignIn close={props.close} connected={props.connected} />
      )}
    </div>
  )
}
