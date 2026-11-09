import type { SchemaProps, Viewport } from '@mokly/mokly'
import { InputFrame } from '@firna/ui/input'
import { CircleAlert, CirclePause, LogOut } from 'lucide-react'
import { ActionButton } from '../components/common/actions'
import { Notice } from '../components/common/Notice'
import { ScreenLink } from '../components/common/ScreenLink'
import { useControlSizes } from '../components/common/touch'
import { PendingInviteList } from '../components/members/PendingInvites'
import { PersonAvatar } from '../components/orgs/OrgTile'
import {
  typedCode,
  waitingEmail,
  waitingInvites,
  waitingPerson,
} from '../fixtures/waitlist'
import { noop } from '../noop'
import { paths } from '../paths'
import { inviteRows } from './inviteRows'
import { SignInFrame } from './signInFrame'
import { codeFailures, waitlistCopy as copy } from './waitlistCopy'
import forms from './forms.module.css'
import signIn from './SignInScreen.module.css'
import styles from './WaitlistScreen.module.css'

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
    /** Whether org invitations wait for the person. */
    invitations: { enum: ['none', 'pending'] },
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
      <Notice
        body={from === 'link' ? copy.paused.link : copy.paused.typed}
        icon={CirclePause}
        title={copy.paused.title}
      />
    )
  }
  if (from === 'field') return null
  const text = copy.link[code]
  return (
    <Notice
      body={text.body}
      icon={CircleAlert}
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
          <ActionButton>{copy.useCode}</ActionButton>
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

/** The org invitations of the person. Accept joins the org and lets them in. */
function Invitations(props: { stacked: boolean }) {
  return (
    <div className={styles.invitations}>
      <p className={styles.intro}>{copy.invitations}</p>
      <PendingInviteList
        invites={inviteRows(waitingInvites, 'primary')}
        stacked={props.stacked}
      />
    </div>
  )
}

/** The GitHub account of the person, and Sign out, at the foot of the card. */
function AccountRow() {
  return (
    <div className={styles.account}>
      <PersonAvatar initials={waitingPerson.initials} size={32} />
      <span className={styles.person}>
        <span className={styles.name}>{waitingPerson.name}</span>
        <span className={styles.login}>@{waitingPerson.login}</span>
      </span>
      <ScreenLink asChild to={paths.signIn}>
        <ActionButton icon={LogOut}>{copy.signOut}</ActionButton>
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
 * an invitation, Accept is the main action.
 */
export function WaitlistScreen(props: {
  state: WaitlistState
  viewport: Viewport
}) {
  const invited = props.state.invitations === 'pending'
  const verified = props.state.email === 'verified'
  return (
    <SignInFrame label={copy.title} viewport={props.viewport} wide>
      <h1 className={signIn.title}>{copy.title}</h1>
      <p className={signIn.text}>
        {verified ? copy.email(waitingEmail) : copy.noEmail}
      </p>
      {invited ? <Invitations stacked={props.viewport === 'mobile'} /> : null}
      <CodeNotice state={props.state} />
      <CodeField state={props.state} />
      <AccountRow />
    </SignInFrame>
  )
}
