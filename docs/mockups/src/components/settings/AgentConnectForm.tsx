import type { ReactNode } from 'react'
import { Input } from '@firna/ui/input'
import { SegmentedControl } from '@firna/ui/segmented'
import { productName } from '../../../../../src/shared/brand'
import { agents, type AgentKey } from '../../fixtures/agents'
import { pastedKey, type LoginKind } from '../../fixtures/logins'
import { noop } from '../../../../../src/ui/noop'
import { actionButton } from '../../entries/components/common/actions.mockup'
import { externalLink } from '../../entries/components/common/ExternalLink.mockup'
import { notice } from '../../entries/components/common/Notice.mockup'
import { ScreenLink } from '../common/ScreenLink'
import { useControlSizes } from '../../../../../src/ui/components/common/touch'
import {
  agentConnectCopy as copy,
  connectKinds,
  loginLabels,
  orgConnectKinds,
} from '../../../../../src/ui/components/settings/agentConnectCopy'
import { chatGptSignIn } from '../../entries/components/settings/ChatGptSignIn.mockup'
import { endpointFields } from '../../entries/components/settings/EndpointFields.mockup'
import type { EndpointEntry } from './EndpointFields'
import type { SignInStep } from '../../../../../src/ui/components/settings/chatGptSignInCopy'
import styles from '../../../../../src/ui/components/settings/AgentConnectForm.module.css'

/** The app stores a secret without a test of it, as the app says too. */
const keepHint = `${productName} keeps it encrypted, and never shows it again.`

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

/**
 * An API key: a key of the own account of the user, or of the account of
 * the org, such as "Acme's", for an org login.
 */
function keyAsk(agent: AgentKey, org: string | undefined): SecretAsk {
  const { key } = copy
  const whose = org ? key.whose.org(org) : key.whose.own
  return {
    type: 'secret',
    text: (
      <>
        {key.text(agent, whose)}{' '}
        <externalLink.Component
          href={key.pages[agent]}
          moklyInstance={`${agent}-keys`}
        >
          {key.link(agent)}
        </externalLink.Component>
      </>
    ),
    label: key.label(agent),
    placeholder: key.placeholder,
  }
}

/** The subscription token of Claude, from a command on the own computer. */
const tokenAsk: SecretAsk = {
  type: 'secret',
  text: (
    <>
      {copy.token.before}{' '}
      <code className={styles.code}>{copy.token.command}</code>{' '}
      {copy.token.after}
    </>
  ),
  label: copy.token.label,
  placeholder: copy.token.placeholder,
}

/** What each agent asks for, by the kind that the switch selects. */
function askOf(agent: AgentKey, kind: LoginKind, org?: string): Ask {
  if (kind === 'endpoint') return { type: 'endpoint' }
  if (kind === 'api-key') return keyAsk(agent, org)
  return agent === 'claude' ? tokenAsk : { type: 'chatgpt-sign-in' }
}

/** What the end of a form needs. */
type FormEndProps = {
  agent: AgentKey
  connectTo: string
  cancel: boolean
  replace?: boolean
  failed?: string
}

/**
 * The end of a form: the notice of a save that failed, then Cancel, when
 * the form can close, and the main button, which leads to `connectTo`. The
 * main button says Connect, or Replace in a form that replaces a connected
 * login.
 */
function FormEnd(props: FormEndProps) {
  const agent = agents[props.agent].name
  const title = props.replace
    ? `The ${agent} login wasn't replaced`
    : `${agent} wasn't connected`
  return (
    <>
      {props.failed ? (
        <notice.Component
          body={props.failed}
          icon="triangle-alert"
          moklyInstance="connect-failed"
          title={title}
          tone="danger"
        />
      ) : null}
      <div className={styles.actions}>
        {props.cancel ? (
          <actionButton.Component moklyInstance="cancel-connect">
            Cancel
          </actionButton.Component>
        ) : null}
        <ScreenLink asChild to={props.connectTo}>
          <actionButton.Component moklyInstance="connect-login" tone="primary">
            {props.replace ? 'Replace' : 'Connect'}
          </actionButton.Component>
        </ScreenLink>
      </div>
    </>
  )
}

/**
 * The field of a secret, with the hint that the app keeps it, then the end
 * of the form. After a save that failed, the secret stays in its field.
 */
function SecretFields(props: { ask: SecretAsk; end: FormEndProps }) {
  const { field } = useControlSizes()
  return (
    <>
      <p className={styles.text}>{props.ask.text}</p>
      <Input
        autoComplete="off"
        hint={keepHint}
        invalid={props.end.failed !== undefined}
        label={props.ask.label}
        onChangeText={noop}
        placeholder={props.ask.placeholder}
        secureTextEntry
        size={field}
        value={props.end.failed === undefined ? '' : pastedKey}
      />
      <FormEnd {...props.end} />
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
 *
 * `org` names the org of an org login, from decision 1 B of the org logins
 * plan: the switch then offers only an API key and an own endpoint, and the
 * words ask for a key of the account of the org. `replace` makes the form
 * replace a connected login, and `failed` gives the cause of a save that
 * failed, over the buttons.
 */
export function AgentConnectForm(props: {
  agent: AgentKey
  kind?: LoginKind
  connectTo: string
  cancel: boolean
  signIn?: SignInStep
  endpoint?: EndpointEntry
  org?: string
  replace?: boolean
  failed?: string
}) {
  const { field } = useControlSizes()
  const kinds = (props.org ? orgConnectKinds : connectKinds)[props.agent]
  const kind = props.endpoint ? 'endpoint' : (props.kind ?? kinds[0])
  const ask = askOf(props.agent, kind, props.org)
  const end: FormEndProps = {
    agent: props.agent,
    connectTo: props.connectTo,
    cancel: props.cancel,
    replace: props.replace,
    failed: props.failed,
  }
  return (
    <div className={styles.form}>
      <SegmentedControl
        accessibilityLabel={copy.switchLabel}
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
          <endpointFields.Component
            agent={props.agent}
            entry={props.endpoint ?? 'empty'}
            keyHint={keepHint}
            moklyInstance="endpoint-fields"
          />
          <FormEnd {...end} />
        </>
      ) : ask.type === 'secret' ? (
        <SecretFields ask={ask} end={end} />
      ) : (
        <chatGptSignIn.Component
          cancel={props.cancel}
          codeTo={props.connectTo}
          moklyInstance="chatgpt-sign-in"
          step={props.signIn ?? 'start'}
        />
      )}
    </div>
  )
}
