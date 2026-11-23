import type { ReactNode } from 'react'
import { CircleAlert, TimerOff, type LucideIcon } from 'lucide-react'
import {
  chatGptCode,
  chatGptDevicePage,
  signInRefusedCause,
} from '../../fixtures/logins'
import { actionButton } from '../../entries/components/common/actions.mockup'
import { classes } from '../../../../../src/ui/components/common/classes'
import { externalLink } from '../../entries/components/common/ExternalLink.mockup'
import { ScreenLink } from '../common/ScreenLink'
import { statusText } from '../../entries/components/common/StatusText.mockup'
import {
  chatGptSignInCopy as copy,
  type SignInStep,
} from '../../../../../src/ui/components/settings/chatGptSignInCopy'
import formStyles from '../../../../../src/ui/components/settings/AgentConnectForm.module.css'
import styles from '../../../../../src/ui/components/settings/ChatGptSignIn.module.css'

/** The address of the page of OpenAI, as the user reads and types it. */
const deviceAddress = chatGptDevicePage.replace(/^https:\/\//, '')

/** Cancel, when the form can close, then the button of the step. */
function Actions(props: { cancel: boolean; children?: ReactNode }) {
  if (!props.cancel && !props.children) return null
  return (
    <div className={formStyles.actions}>
      {props.cancel ? (
        <actionButton.Component moklyInstance="cancel-sign-in">
          Cancel
        </actionButton.Component>
      ) : null}
      {props.children}
    </div>
  )
}

/** The button that asks OpenAI for a code, and leads to the code. */
function CodeButton(props: { label: string; to: string }) {
  return (
    <ScreenLink asChild to={props.to}>
      <actionButton.Component moklyInstance="get-code" tone="primary">
        {props.label}
      </actionButton.Component>
    </ScreenLink>
  )
}

/** The link to the security settings of ChatGPT, in a new tab. */
function SettingsLink() {
  return (
    <externalLink.Component
      href={copy.settingsLink.href}
      moklyInstance="chatgpt-settings"
    >
      {copy.settingsLink.label}
    </externalLink.Component>
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
        <externalLink.Component
          href={chatGptDevicePage}
          moklyInstance="device-page"
        >
          {deviceAddress}
        </externalLink.Component>
        {copy.steps.after}
      </p>
      <p className={styles.code}>{chatGptCode}</p>
      <p className={styles.hint}>{copy.keep}</p>
      <div role="status">
        <statusText.Component
          busy
          label={copy.waiting}
          moklyInstance="waiting-for-code"
          tone="active"
        />
      </div>
    </>
  )
}

/**
 * A sign-in that did not finish, with an icon on the first line. A link,
 * such as the one to the setting that the text names, follows the text.
 */
function Problem(props: {
  icon: LucideIcon
  text: string
  refused?: boolean
  children?: ReactNode
}) {
  const Icon = props.icon
  return (
    <p
      className={classes(styles.problem, props.refused && styles.refused)}
      role={props.refused ? 'alert' : undefined}
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
 * The ChatGPT sign-in of Codex, in the Connect form, by step. Before the
 * start, the words name the setting of ChatGPT that must be on, with the
 * link to it. Get a code shows a one-time code and the link to the page of
 * OpenAI where the user enters it, while the page waits for the sign-in. An
 * expired code offers Get a new code. The refused sign-in is the refusal of
 * the first request, because the setting is off: it names the setting, with
 * the link, and offers Get a code, because no code showed yet. Each button
 * that gets a code leads to `codeTo`. Cancel shows when the form can close.
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
          <p className={formStyles.text}>
            {copy.intro} <SettingsLink />
          </p>
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
          <Problem icon={CircleAlert} refused text={signInRefusedCause}>
            <SettingsLink />
          </Problem>
          <Actions cancel={props.cancel}>
            <CodeButton label={copy.getCode} to={props.codeTo} />
          </Actions>
        </>
      )
  }
}
