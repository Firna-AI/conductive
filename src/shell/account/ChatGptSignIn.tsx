import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react'
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
import ui from '../ui/ui.module.css'
import { CodexSignIn, type SignInCode, type SignInState } from './codex-sign-in'
import { useStepFocus } from './step-focus'

/** The first line of a step, which takes the focus as `useStepFocus` says. */
type Line = Ref<HTMLParagraphElement>

/** The first line of the step that shows, as the form gives it. */
export type SignInLine = RefObject<HTMLParagraphElement | null>

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

/** The link to the security settings of ChatGPT, in a new tab. */
function SettingsLink() {
  return (
    <ExternalLink href={copy.settingsLink.href}>
      {copy.settingsLink.label}
    </ExternalLink>
  )
}

/**
 * The link to the page of OpenAI, the code in large type, the warning
 * never to share it, and the line that says that the page waits. `ref`
 * gets the first line.
 */
function CodeShown(props: { code: SignInCode; ref: Line }) {
  const { code, ref } = props
  const { userCode, verificationUrl } = code
  return (
    <>
      <p
        className={classes(formStyles.text, ui.focusTarget)}
        ref={ref}
        tabIndex={-1}
      >
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

/**
 * A sign-in that did not finish, with an icon on the first line. A link,
 * such as the one to the setting that the text names, follows the text.
 * `ref` gets the line.
 */
function Problem(props: {
  icon: LucideIcon
  text: string
  ref: Line
  refused?: boolean
  children?: ReactNode
}) {
  const { icon: Icon, ref } = props
  return (
    <p
      className={classes(
        styles.problem,
        props.refused && styles.refused,
        ui.focusTarget,
      )}
      ref={ref}
      role={props.refused ? 'alert' : undefined}
      tabIndex={-1}
    >
      <Icon aria-hidden className={styles.icon} size={14} />
      <span>
        {props.text}
        {props.children ? <> {props.children}</> : null}
      </span>
    </p>
  )
}

/**
 * The words and the buttons of the step that the sign-in shows. The button
 * that asks for a code says Get a code until a code showed, then Get a new
 * code, and it is busy while the request runs. The refusal because device
 * code sign-in is off names the setting, so the link to it follows. `ref`
 * gets the first line of the step.
 */
function Step(props: {
  state: SignInState
  ref: Line
  close?: () => void
  start: () => void
}) {
  const { state, ref } = props
  const { stage, starting, codeShown } = state
  const ask = (
    <Actions close={props.close}>
      <ActionButton busy={starting} onPress={props.start} tone="primary">
        {codeShown ? copy.newCode : copy.getCode}
      </ActionButton>
    </Actions>
  )
  switch (stage.step) {
    case 'start':
      return (
        <>
          <p
            className={classes(formStyles.text, ui.focusTarget)}
            ref={ref}
            tabIndex={-1}
          >
            {copy.intro} <SettingsLink />
          </p>
          {ask}
        </>
      )
    case 'code':
      return (
        <>
          <CodeShown code={stage.code} ref={ref} />
          <Actions close={props.close} />
        </>
      )
    case 'expired':
      return (
        <>
          <Problem icon={TimerOff} ref={ref} text={copy.expired} />
          {ask}
        </>
      )
    case 'refused':
      return (
        <>
          <Problem icon={CircleAlert} ref={ref} refused text={stage.cause}>
            {stage.cause === copy.causes.refused ? <SettingsLink /> : null}
          </Problem>
          {ask}
        </>
      )
  }
}

/**
 * The ChatGPT sign-in of Codex, in the Connect form, by step. Before the
 * start, the words name the setting of ChatGPT that must be on, with the
 * link to it. Get a code shows a one-time code and the link to the page of
 * OpenAI where the user enters it, while the page asks the Worker whether
 * the sign-in finished. An expired code and a refused sign-in offer a code
 * again. A request for a code that failed shows its cause as a refused
 * sign-in does. `line` gets the first line of the step that shows. The form
 * gives the first step the focus after a press, and each later step takes
 * it on its first line, as `useStepFocus` says. At the end of the sign-in, the account shows the
 * login, and `connected` runs. Cancel shows when `close` is set. Cancel and
 * the end of the form stop the sign-in.
 */
export function ChatGptSignIn(props: {
  close?: () => void
  connected: () => void
  line: SignInLine
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
  const steps = useRef<HTMLDivElement>(null)
  const { line } = props
  useStepFocus(state.stage, steps, line)
  const start = () => {
    void signIn.start(() => connected.current())
  }
  return (
    <div className={ui.contents} ref={steps}>
      <Step close={props.close} ref={line} start={start} state={state} />
    </div>
  )
}
