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
import type { Agent } from '../../shared/agents'
import { useApp } from '../context'
import { ActionButton } from '../ui/actions'
import { ExternalLink } from '../ui/links'
import { agentNames, loginLabels, type LoginKind } from './labels'

/** The pages where a user makes the secret of a login. */
const secretPages = {
  anthropicKey: 'https://console.anthropic.com/settings/keys',
  openAiKey: 'https://platform.openai.com/api-keys',
  codexToken: 'https://chatgpt.com/admin/access-tokens',
} as const

/** The agent login API stores the secret without a test of it. */
const keepHint = `${productName} keeps it encrypted, and never shows it again.`

/**
 * The kinds of each agent in the order of the switch of its form. The first
 * kind starts selected. Most members have an OpenAI API key, and a Codex
 * access token needs a ChatGPT Business or Enterprise workspace, so the API
 * key comes first for Codex.
 */
const connectKinds: Readonly<
  Record<Agent, readonly [LoginKind, ...LoginKind[]]>
> = {
  claude: ['token', 'api-key'],
  codex: ['api-key', 'token'],
}

/**
 * What a form asks for: the words that say what to paste and where to get
 * it, then the label and the placeholder of the field.
 */
type SecretAsk = { text: ReactNode; label: string; placeholder: string }

/** What each agent asks for, by the kind that the switch selects. */
const asks: Readonly<Record<Agent, Readonly<Record<LoginKind, SecretAsk>>>> = {
  claude: {
    token: {
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
    token: {
      text: (
        <>
          Paste an access token from your ChatGPT Business or Enterprise
          workspace, with the Codex scope. The owner of that workspace must
          allow access tokens and local Codex use.{' '}
          <ExternalLink href={secretPages.codexToken}>
            Make one in ChatGPT
          </ExternalLink>
        </>
      ),
      label: 'Codex access token',
      placeholder: 'Paste the token',
    },
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
 * The form that connects an agent, open under its row. Its switch chooses
 * the kind of the login: a subscription token or an API key for Claude,
 * and an API key or an access token for Codex. The first kind of the agent
 * starts selected. The secret leaves the browser once, in the save, with
 * the chosen kind. A failed save keeps the secret in the field and shows
 * why. Cancel shows when `close` is set.
 */
export function AgentConnectForm(props: {
  agent: Agent
  close?: () => void
  connected: () => void
}) {
  const app = useApp()
  const { field } = useControlSizes()
  const [form] = useState(() => new SecretForm())
  const kinds = connectKinds[props.agent]
  const [kind, setKind] = useState<LoginKind>(kinds[0])
  const state = useStore(form.state)
  const ask = asks[props.agent][kind]
  const submit = () => {
    void form
      .submit((secret) =>
        app.account.saveLogin({ agent: props.agent, kind, secret }),
      )
      .then((saved) => {
        if (saved) props.connected()
      })
  }
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
      <p className={styles.text}>{ask.text}</p>
      <SecretField ask={ask} form={form} submit={submit} />
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
