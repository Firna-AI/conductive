import type { ReactNode } from 'react'
import { Input } from '@firna/ui/input'
import { SegmentedControl } from '@firna/ui/segmented'
import { productName } from '../../brand'
import type { AgentKey } from '../../fixtures/agents'
import {
  anthropicKeyPage,
  claudeTokenCommand,
  codexTokenPage,
  connectKinds,
  loginLabels,
  openAiKeyPage,
  type LoginKind,
} from '../../fixtures/logins'
import { noop } from '../../noop'
import { ActionButton } from '../common/actions'
import { ExternalLink } from '../common/ExternalLink'
import { ScreenLink } from '../common/ScreenLink'
import { useControlSizes } from '../common/touch'
import styles from './AgentConnectForm.module.css'

const testHint = `${productName} tests it once, and never shows it again.`

/**
 * What a form asks for: the words that say what to paste and where to get
 * it, then the label and the placeholder of the field.
 */
type SecretAsk = { text: ReactNode; label: string; placeholder: string }

/** What each agent asks for, by the kind that the switch selects. */
type AgentAsks = Readonly<
  Record<AgentKey, Readonly<Record<LoginKind, SecretAsk>>>
>

const asks: AgentAsks = {
  claude: {
    token: {
      text: (
        <>
          Run <code className={styles.code}>{claudeTokenCommand}</code> on your
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
          <ExternalLink href={anthropicKeyPage}>
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
          <ExternalLink href={openAiKeyPage}>Make one on OpenAI</ExternalLink>
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
          <ExternalLink href={codexTokenPage}>Make one in ChatGPT</ExternalLink>
        </>
      ),
      label: 'Codex access token',
      placeholder: 'Paste the token',
    },
  },
}

/**
 * The form that connects an agent, open under its row. Its switch chooses
 * the kind of the login: a subscription token or an API key for Claude,
 * and an API key or an access token for Codex. `kind` is the kind that the
 * switch selects, by default the first kind of the agent. Connect leads to
 * `connectTo`. Cancel shows when the form can close.
 */
export function AgentConnectForm(props: {
  agent: AgentKey
  kind?: LoginKind
  connectTo: string
  cancel: boolean
}) {
  const { field } = useControlSizes()
  const kinds = connectKinds[props.agent]
  const kind = props.kind ?? kinds[0]
  const ask = asks[props.agent][kind]
  return (
    <div className={styles.form}>
      <SegmentedControl
        accessibilityLabel="Connect with"
        onChange={noop}
        options={kinds.map((item) => ({
          label: loginLabels[props.agent][item],
          value: item,
        }))}
        size={field}
        value={kind}
      />
      <p className={styles.text}>{ask.text}</p>
      <Input
        autoComplete="off"
        hint={testHint}
        label={ask.label}
        onChangeText={noop}
        placeholder={ask.placeholder}
        secureTextEntry
        size={field}
        value=""
      />
      <div className={styles.actions}>
        {props.cancel ? <ActionButton>Cancel</ActionButton> : null}
        <ScreenLink asChild to={props.connectTo}>
          <ActionButton tone="primary">Connect</ActionButton>
        </ScreenLink>
      </div>
    </div>
  )
}
