import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CircleAlert, TimerOff, type LucideIcon } from 'lucide-react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import { StatusText } from '../../../docs/mockups/src/components/common/StatusText'
import formStyles from '../../../docs/mockups/src/components/settings/AgentConnectForm.module.css'
import styles from '../../../docs/mockups/src/components/settings/ChatGptSignIn.module.css'
import { chatGptSignInCopy as copy } from '../../../docs/mockups/src/components/settings/chatGptSignInCopy'
import { useServices } from '../../app/services'
import { useStore } from '../../app/store'
import { useApp } from '../context'
import { ActionButton } from '../ui/actions'
import { ExternalLink } from '../ui/links'
import { CodexSignIn, type SignInCode, type SignInState } from './codex-sign-in'

/** The address of a page of OpenAI, as the user reads and types it. */
function address(url: string): string {
  return url.replace(/^https:\/\//, '')
}

/** Cancel, when the form can close, then the button of the step. */
function Actions(props: { close?: () => void; children?: ReactNode }) {
  if (!props.close && !props.children) return null
  return (
    <div className={formStyles.actions}>
      {props.close ? (
        <ActionButton onPress={props.close}>Cancel</ActionButton>
      ) : null}
      {props.children}
    </div>
  )
}

/**
 * The link to the page of OpenAI, the code in large type, the warning
 * never to share it, and the line that says that the page waits.
 */
function CodeShown(props: { code: SignInCode }) {
  const { userCode, verificationUrl } = props.code
  return (
    <>
      <p className={formStyles.text}>
        {copy.steps.before}{' '}
        <ExternalLink href={verificationUrl}>
          {address(verificationUrl)}
        </ExternalLink>
        {copy.steps.after}
      </p>
      <p className={styles.code}>{userCode}</p>
      <p className={styles.hint}>{copy.keep}</p>
      <div role="status">
        <StatusText busy label={copy.waiting} tone="active" />
      </div>
    </>
  )
}

/** A sign-in that did not finish, with an icon on the first line. */
function Problem(props: { icon: LucideIcon; text: string; refused?: boolean }) {
  const Icon = props.icon
  return (
    <p
      className={classes(styles.problem, props.refused && styles.refused)}
      role={props.refused ? 'alert' : undefined}
    >
      <Icon aria-hidden className={styles.icon} size={14} />
      <span>{props.text}</span>
    </p>
  )
}

/**
 * The words and the buttons of the step that the sign-in shows. The button
 * that asks for a code is busy while the request runs.
 */
function Step(props: {
  state: SignInState
  close?: () => void
  start: () => void
}) {
  const { stage, starting } = props.state
  const ask = (label: string) => (
    <Actions close={props.close}>
      <ActionButton busy={starting} onPress={props.start} tone="primary">
        {label}
      </ActionButton>
    </Actions>
  )
  switch (stage.step) {
    case 'start':
      return (
        <>
          <p className={formStyles.text}>{copy.intro}</p>
          {ask(copy.getCode)}
        </>
      )
    case 'code':
      return (
        <>
          <CodeShown code={stage.code} />
          <Actions close={props.close} />
        </>
      )
    case 'expired':
      return (
        <>
          <Problem icon={TimerOff} text={copy.expired} />
          {ask(copy.newCode)}
        </>
      )
    case 'refused':
      return (
        <>
          <Problem icon={CircleAlert} refused text={stage.cause} />
          {ask(copy.newCode)}
        </>
      )
  }
}

/**
 * The ChatGPT sign-in of Codex, in the Connect form, by step. Before the
 * start, the words name the setting of ChatGPT that must be on. Get a code
 * shows a one-time code and the link to the page of OpenAI where the user
 * enters it, while the page asks the Worker whether the sign-in finished.
 * An expired code and a refused sign-in offer a new code. A request for a
 * code that failed shows its cause as a refused sign-in does. At the end of
 * the sign-in, the account shows the login, and `connected` runs. Cancel
 * shows when `close` is set. Cancel and the end of the form stop the
 * sign-in.
 */
export function ChatGptSignIn(props: {
  close?: () => void
  connected: () => void
}) {
  const app = useApp()
  const services = useServices()
  const connected = useRef(props.connected)
  useEffect(() => {
    connected.current = props.connected
  })
  const [signIn] = useState(() => new CodexSignIn(app.account, services))
  useEffect(() => () => signIn.stop(), [signIn])
  const state = useStore(signIn.state)
  const start = () => {
    void signIn.start(() => connected.current())
  }
  return <Step close={props.close} start={start} state={state} />
}
