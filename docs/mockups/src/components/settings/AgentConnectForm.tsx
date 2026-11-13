import type { ReactNode } from 'react'
import { Input } from '@firna/ui/input'
import { SegmentedControl } from '@firna/ui/segmented'
import { productName } from '../../brand'
import type { AgentKey } from '../../fixtures/agents'
import {
  anthropicKeyPage,
  claudeTokenCommand,
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
import { ChatGptSignIn } from './ChatGptSignIn'
import { EndpointFields, type EndpointEntry } from './EndpointFields'
import type { SignInStep } from './chatGptSignInCopy'
import styles from './AgentConnectForm.module.css'

const testHint = `${productName} tests it once, and never shows it again.`

/**
 * A secret to paste: the words that say what to paste and where to get it,
 * then the label and the placeholder of the field.
 */
type SecretAsk = {
  type: 'secret'
  text: ReactNode
  label: string
  placeholder: string
}

/** What a form asks for: a secret, or the ChatGPT sign-in, with no field. */
type Ask = SecretAsk | { type: 'chatgpt-sign-in' } | { type: 'endpoint' }

/** What each agent asks for, by the kind that the switch selects. */
type AgentAsks = Readonly<Record<AgentKey, Readonly<Record<LoginKind, Ask>>>>

const asks: AgentAsks = {
  claude: {
    endpoint: { type: 'endpoint' },
    token: {
      type: 'secret',
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
      type: 'secret',
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
    endpoint: { type: 'endpoint' },
    'api-key': {
      type: 'secret',
      text: (
        <>
          Paste an API key of your OpenAI account.{' '}
          <ExternalLink href={openAiKeyPage}>Make one on OpenAI</ExternalLink>
        </>
      ),
      label: 'OpenAI API key',
      placeholder: 'Paste the key',
    },
    token: { type: 'chatgpt-sign-in' },
  },
}

/**
 * The field of a secret, with the hint that the app tests it once, then
 * Cancel, when the form can close, and Connect, which leads to `connectTo`.
 */
function SecretFields(props: {
  ask: SecretAsk
  connectTo: string
  cancel: boolean
}) {
  const { field } = useControlSizes()
  return (
    <>
      <p className={styles.text}>{props.ask.text}</p>
      <Input
        autoComplete="off"
        hint={testHint}
        label={props.ask.label}
        onChangeText={noop}
        placeholder={props.ask.placeholder}
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
    </>
  )
}

/**
 * The form that connects an agent, open under its row. Its switch chooses
 * the kind of the login, including an own endpoint for either agent.
 * It offers a subscription token or an API key for Claude,
 * and an API key or the ChatGPT plan for Codex. `kind` is the kind that the
 * switch selects, by default the first kind of the agent. A secret has its
 * field and Connect. The ChatGPT plan has the steps of its sign-in, from
 * `signIn`, by default before the start. The main button, Connect or the
 * button that gets a code, leads to `connectTo`. Cancel shows when the form
 * can close.
 */
export function AgentConnectForm(props: {
  agent: AgentKey
  kind?: LoginKind
  connectTo: string
  cancel: boolean
  signIn?: SignInStep
  endpoint?: EndpointEntry
}) {
  const { field } = useControlSizes()
  const kinds = connectKinds[props.agent]
  const kind = props.endpoint ? 'endpoint' : (props.kind ?? kinds[0])
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
        wrap
      />
      {ask.type === 'endpoint' ? (
        <>
          <EndpointFields
            agent={props.agent}
            entry={props.endpoint ?? 'empty'}
            keyHint={`${productName} keeps it encrypted, and never shows it again.`}
          />
          <div className={styles.actions}>
            {props.cancel ? <ActionButton>Cancel</ActionButton> : null}
            <ScreenLink asChild to={props.connectTo}>
              <ActionButton tone="primary">Connect</ActionButton>
            </ScreenLink>
          </div>
        </>
      ) : ask.type === 'secret' ? (
        <SecretFields
          ask={ask}
          cancel={props.cancel}
          connectTo={props.connectTo}
        />
      ) : (
        <ChatGptSignIn
          cancel={props.cancel}
          codeTo={props.connectTo}
          step={props.signIn ?? 'start'}
        />
      )}
    </div>
  )
}
