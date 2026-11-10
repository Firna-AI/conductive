import type { ReactNode } from 'react'
import { CircleAlert, TimerOff, type LucideIcon } from 'lucide-react'
import {
  chatGptCode,
  chatGptDevicePage,
  signInRefusedCause,
} from '../../fixtures/logins'
import { ActionButton } from '../common/actions'
import { classes } from '../common/classes'
import { ExternalLink } from '../common/ExternalLink'
import { ScreenLink } from '../common/ScreenLink'
import { StatusText } from '../common/StatusText'
import { chatGptSignInCopy as copy, type SignInStep } from './chatGptSignInCopy'
import formStyles from './AgentConnectForm.module.css'
import styles from './ChatGptSignIn.module.css'

/** The address of the page of OpenAI, as the user reads and types it. */
const deviceAddress = chatGptDevicePage.replace(/^https:\/\//, '')

/** Cancel, when the form can close, then the button of the step. */
function Actions(props: { cancel: boolean; children?: ReactNode }) {
  if (!props.cancel && !props.children) return null
  return (
    <div className={formStyles.actions}>
      {props.cancel ? <ActionButton>Cancel</ActionButton> : null}
      {props.children}
    </div>
  )
}

/** The button that asks OpenAI for a code, and leads to the code. */
function CodeButton(props: { label: string; to: string }) {
  return (
    <ScreenLink asChild to={props.to}>
      <ActionButton tone="primary">{props.label}</ActionButton>
    </ScreenLink>
  )
}

/**
 * The link to the page of OpenAI, the code in large type, the warning
 * never to share it, and the line that says that the page waits.
 */
function CodeShown() {
  return (
    <>
      <p className={formStyles.text}>
        {copy.steps.before}{' '}
        <ExternalLink href={chatGptDevicePage}>{deviceAddress}</ExternalLink>
        {copy.steps.after}
      </p>
      <p className={styles.code}>{chatGptCode}</p>
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
 * The ChatGPT sign-in of Codex, in the Connect form, by step. Before the
 * start, the words name the setting of ChatGPT that must be on. Get a code
 * shows a one-time code and the link to the page of OpenAI where the user
 * enters it, while the page waits for the sign-in. An expired code and a
 * refused sign-in offer a new code. Each button that gets a code leads to
 * `codeTo`. Cancel shows when the form can close.
 */
export function ChatGptSignIn(props: {
  step: SignInStep
  codeTo: string
  cancel: boolean
}) {
  switch (props.step) {
    case 'start':
      return (
        <>
          <p className={formStyles.text}>{copy.intro}</p>
          <Actions cancel={props.cancel}>
            <CodeButton label={copy.getCode} to={props.codeTo} />
          </Actions>
        </>
      )
    case 'code':
      return (
        <>
          <CodeShown />
          <Actions cancel={props.cancel} />
        </>
      )
    case 'expired':
      return (
        <>
          <Problem icon={TimerOff} text={copy.expired} />
          <Actions cancel={props.cancel}>
            <CodeButton label={copy.newCode} to={props.codeTo} />
          </Actions>
        </>
      )
    case 'refused':
      return (
        <>
          <Problem icon={CircleAlert} refused text={signInRefusedCause} />
          <Actions cancel={props.cancel}>
            <CodeButton label={copy.newCode} to={props.codeTo} />
          </Actions>
        </>
      )
  }
}
