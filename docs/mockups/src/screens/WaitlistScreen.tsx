import type { SchemaProps, Viewport } from '@mokly/mokly'
import { InputFrame } from '@firna/ui/input'
import { actionButton } from '../entries/components/common/actions.mockup'
import { notice } from '../entries/components/common/Notice.mockup'
import { ScreenLink } from '../components/common/ScreenLink'
import { useControlSizes } from '../../../../src/ui/components/common/touch'
import { pendingInviteList } from '../entries/components/members/PendingInvites.mockup'
import { personAvatar } from '../entries/components/orgs/OrgTile.mockup'
import {
  typedCode,
  waitingEmail,
  waitingInvites,
  waitingPerson,
} from '../fixtures/waitlist'
import { noop } from '../../../../src/ui/noop'
import { paths } from '../paths'
import { inviteRows } from './inviteRows'
import { signInFrame } from '../entries/components/screens/signInFrame.mockup'
import {
  codeFailures,
  waitlistCopy as copy,
} from '../../../../src/ui/screens/waitlistCopy'
import forms from '../../../../src/ui/screens/forms.module.css'
import signIn from '../../../../src/ui/screens/SignInScreen.module.css'
import styles from '../../../../src/ui/screens/WaitlistScreen.module.css'

export const waitlistSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['email', 'code', 'from', 'invitations'],
  properties: {
    /**
     * Whether the GitHub account has a primary verified email, which gets
     * the approval email. An org invitation needs a verified email too.
     */
    email: { enum: ['verified', 'none'] },
    /** No code tried yet, or why the last code did not let the person in. */
    code: { enum: ['none', ...codeFailures] },
    /** Where that code came from: the field of the screen, or a join link. */
    from: { enum: ['field', 'link'] },
    /**
     * Whether org invitations wait for the person. `paused`: the pause of
     * sign-ups stopped Accept, and the invitation stays.
     */
    invitations: { enum: ['none', 'pending', 'paused'] },
  },
} as const

export type WaitlistState = SchemaProps<typeof waitlistSchema>

/**
 * The notice above the field: the pause, which leaves the code unused, or
 * the code of a join link that did not work. A typed code that did not
 * work shows its reason under the field instead.
 */
function CodeNotice(props: { state: WaitlistState }) {
  const { code, from } = props.state
  if (code === 'none') return null
  if (code === 'paused') {
    return (
      <notice.Component
        body={from === 'link' ? copy.paused.link : copy.paused.typed}
        icon="circle-pause"
        moklyInstance="code-notice"
        title={copy.paused.title}
      />
    )
  }
  if (from === 'field') return null
  const text = copy.link[code]
  return (
    <notice.Component
      body={text.body}
      icon="circle-alert"
      moklyInstance="code-notice"
      title={text.title}
      tone="danger"
    />
  )
}

/**
 * The field of an invite code, with Use code. A code that works lets the
 * person in, and the app opens Get started. A typed code keeps its text
 * after it did not work, so the person can fix it. Most people who wait
 * have no code, so Use code is not the main action, as Invite of the
 * Members tab is not.
 */
function CodeField(props: { state: WaitlistState }) {
  const { field } = useControlSizes()
  const { code, from } = props.state
  const typed = from === 'field' && code !== 'none'
  const error = typed && code !== 'paused' ? copy.typed[code] : undefined
  return (
    <div className={forms.field}>
      <span className={forms.fieldLabel}>{copy.codeLabel}</span>
      <div className={styles.row}>
        <InputFrame
          accessibilityLabel={copy.codeLabel}
          autoCapitalize="characters"
          autoComplete="off"
          invalid={error !== undefined}
          onChangeText={noop}
          placeholder={copy.codePlaceholder}
          size={field}
          value={typed ? typedCode : ''}
        />
        <ScreenLink asChild to={paths.getStarted}>
          <actionButton.Component moklyInstance="use-code">
            {copy.useCode}
          </actionButton.Component>
        </ScreenLink>
      </div>
      {error ? (
        <span className={styles.error} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  )
}

/**
 * The org invitations of the person. Accept joins the org and lets them
 * in. When the pause of sign-ups stopped Accept, a notice above the rows
 * says that the invitation stays, as a failed accept shows above the rows
 * of the Invitations page.
 */
function Invitations(props: { paused: boolean; stacked: boolean }) {
  return (
    <div className={styles.invitations}>
      <p className={styles.intro}>{copy.invitations}</p>
      {props.paused ? (
        <notice.Component
          body={copy.paused.invitation}
          icon="circle-pause"
          moklyInstance="invitations-paused"
          title={copy.paused.title}
        />
      ) : null}
      <pendingInviteList.Component
        invites={inviteRows(waitingInvites, 'primary')}
        moklyInstance="invitations"
        stacked={props.stacked}
      />
    </div>
  )
}

/** The GitHub account of the person, and Sign out, at the foot of the card. */
function AccountRow() {
  return (
    <div className={styles.account}>
      <personAvatar.Component
        initials={waitingPerson.initials}
        moklyInstance="waiting-person"
        size={32}
      />
      <span className={styles.person}>
        <span className={styles.name}>{waitingPerson.name}</span>
        <span className={styles.login}>@{waitingPerson.login}</span>
      </span>
      <ScreenLink asChild to={paths.signIn}>
        <actionButton.Component icon="log-out" moklyInstance="sign-out">
          {copy.signOut}
        </actionButton.Component>
      </ScreenLink>
    </div>
  )
}

/**
 * The only screen of a person who is signed in without app access. It
 * says that they wait, and it offers the ways in that the person can take
 * now: an invite code, and the org invitations that wait for them. An
 * approval of an operator sends an email to the primary verified email of
 * the GitHub account, which the screen names. Without one, the screen
 * promises no email. It has no place in line and no Delete account. With
 * an invitation, Accept is the main action. The pause of sign-ups stops
 * Accept and codes, and the screen names it only after one of them.
 */
export function WaitlistScreen(props: {
  state: WaitlistState
  viewport: Viewport
}) {
  const { invitations } = props.state
  const verified = props.state.email === 'verified'
  return (
    <signInFrame.Component
      label={copy.title}
      moklyInstance="sign-in-frame"
      viewport={props.viewport}
      wide
    >
      <h1 className={signIn.title}>{copy.title}</h1>
      <p className={signIn.text}>
        {verified ? copy.email(waitingEmail) : copy.noEmail}
      </p>
      {invitations === 'none' ? null : (
        <Invitations
          paused={invitations === 'paused'}
          stacked={props.viewport === 'mobile'}
        />
      )}
      <CodeNotice state={props.state} />
      <CodeField state={props.state} />
      <AccountRow />
    </signInFrame.Component>
  )
}
