import type { SchemaProps, Viewport } from '@mokly/mokly'
import { Button } from '@firna/ui/button'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { termsAgreement } from '../../../../src/marketing/legal-text'
import { githubMark } from '../entries/components/common/GitHubMark.mockup'
import { notice } from '../entries/components/common/Notice.mockup'
import { Linked } from '../components/common/ScreenLink'
import { CatalogueText } from '../components/marketing/CatalogueText'
import type { LegalTargets } from '../components/marketing/LegalLinks'
import {
  phoneLegalPages,
  phoneLegalReturn,
} from '../components/phone/phoneLegalPages'
import {
  phoneSignInCopy as copy,
  signInAlertCopy,
} from '../components/phone/phoneSignInCopy'
import { SystemAlertOver } from '../components/phone/SystemAlert'
import { noop } from '../../../../src/ui/noop'
import { phonePaths } from '../phonePaths'
import { signInFrame } from '../entries/components/screens/signInFrame.mockup'
import { signInCopy } from '../../../../src/ui/screens/signInCopy'
import styles from '../../../../src/ui/screens/SignInScreen.module.css'
import own from './PhoneSignInScreen.module.css'

export const phoneSignInSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['stage'],
  properties: {
    /**
     * Where the sign-in stands: the start, the alert of iOS before the
     * auth session, the app that finishes the sign-in after GitHub, a
     * handoff that the app could not finish, or the start after the phone
     * was signed out.
     */
    stage: { enum: ['start', 'ask', 'waiting', 'failed', 'ended'] },
  },
} as const

export type PhoneSignInState = SchemaProps<typeof phoneSignInSchema>

/** A stage whose card offers Continue with GitHub. */
type OfferStage = Exclude<PhoneSignInState['stage'], 'waiting'>

/**
 * The agreement to the terms, and Continue with GitHub, which opens GitHub
 * in the auth session of the system. iOS asks first, so it leads to the
 * alert. Terms and Privacy open on the app host in the in-app browser, as
 * the legal links of the foot do. `legal` and `to` give the destinations
 * of the links, or none.
 */
function ContinueWithGitHub(props: {
  legal: LegalTargets
  to: string | undefined
}) {
  return (
    <>
      <p className={styles.agreement}>
        <CatalogueText legal={props.legal} text={termsAgreement} />
      </p>
      <Linked to={props.to}>
        <Button
          block
          iconNode={
            <githubMark.Component
              className={styles.mark}
              moklyInstance="phone-sign-in-github"
              size={17}
            />
          }
          onPress={noop}
          size="lg"
          tone="primary"
        >
          {signInCopy.action}
        </Button>
      </Linked>
    </>
  )
}

/** The handoff came back, and the app could not finish the sign-in. */
function Failed() {
  return (
    <notice.Component
      body={copy.failed.body}
      icon="circle-alert"
      moklyInstance="phone-sign-in-failed"
      title={copy.failed.title}
      tone="danger"
    />
  )
}

/** The title and the text of the card at each stage that offers it. */
const headings = {
  start: signInCopy,
  ask: signInCopy,
  failed: signInCopy,
  ended: copy.ended,
} as const satisfies Record<OfferStage, { title: string; text: string }>

/** The card that offers the sign-in, with a notice after a failed handoff. */
function Offer(props: { stage: OfferStage; legal: LegalTargets }) {
  const words = headings[props.stage]
  // `ask` draws the alert over the start card, so only the start links to it.
  const to = props.stage === 'start' ? phonePaths.signInAsk : undefined
  return (
    <>
      <h1 className={styles.title}>{words.title}</h1>
      <p className={styles.text}>{words.text}</p>
      {props.stage === 'failed' ? <Failed /> : null}
      <ContinueWithGitHub legal={props.legal} to={to} />
    </>
  )
}

/**
 * GitHub signed the person in, and the auth session closed. The app
 * exchanges the one-use code for its own sign-in, so the card has only
 * its title and a spinner.
 */
function Finishing() {
  const theme = useSharedUiTheme()
  return (
    <div className={own.finishing} role="status">
      <Spinner color={theme.colors.primary} size={18} />
      <h1 className={styles.title}>{copy.waiting.title}</h1>
    </div>
  )
}

/**
 * The sign-in of a phone app. It is the sign-in card of the app, in the
 * frame of a phone app: the wordmark is no link, and the foot has only
 * the legal links. GitHub signs the person in through the auth session of
 * the system, over the app. iOS asks first, with its alert over the
 * start. After GitHub, the card shows that the app finishes the sign-in.
 * A handoff that the app could not finish shows a notice above the
 * agreement. After the phone was signed out, the card asks the person to
 * sign in again.
 */
export function PhoneSignInScreen(props: {
  state: PhoneSignInState
  viewport: Viewport
}) {
  const { stage } = props.state
  // Done of the legal pages shows one stage, so only that stage links them.
  const legal = stage === phoneLegalReturn.stage ? phoneLegalPages : 'still'
  const frame = (
    <signInFrame.Component
      label={stage === 'waiting' ? copy.waiting.title : headings[stage].title}
      legal={legal}
      moklyInstance="phone-sign-in-frame"
      phoneApp
      viewport={props.viewport}
    >
      {stage === 'waiting' ? (
        <Finishing />
      ) : (
        <Offer legal={legal} stage={stage} />
      )}
    </signInFrame.Component>
  )
  if (stage !== 'ask') return frame
  return (
    <SystemAlertOver
      allowTo={phonePaths.signInWaiting}
      denyTo={phonePaths.signIn}
      words={signInAlertCopy}
    >
      {frame}
    </SystemAlertOver>
  )
}
