import type { SchemaProps, Viewport } from '@mokly/mokly'
import { CircleAlert, RotateCw, TriangleAlert } from 'lucide-react'
import { ActionButton } from '../components/common/actions'
import { Notice } from '../components/common/Notice'
import { ScreenLink } from '../components/common/ScreenLink'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { Page } from '../components/layout/Page'
import {
  PendingInviteList,
  type PendingInviteRow,
} from '../components/members/PendingInvites'
import { orgLinks } from '../components/orgs/orgLinks'
import { pendingInvites } from '../fixtures/members'
import { account, orgs, type Org } from '../fixtures/orgs'
import { paths } from '../paths'
import styles from './InvitationsScreen.module.css'

export const invitationsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['result'],
  properties: {
    /**
     * The pending invitations, the same list after an accept that failed,
     * or a list that did not load.
     */
    result: { enum: ['list', 'accept-failed', 'load-failed'] },
  },
} as const

export type InvitationsState = SchemaProps<typeof invitationsSchema>

/** The org whose invitation the failed accept could not accept. */
const failedOrg = orgs.acme

/** The message of the server when the app cannot reach it. */
const offlineMessage =
  "The app can't reach the server. Check the connection, then try again."

/** Accept invitation of one org. It opens the org when the mockups draw it. */
function Accept(props: { org: Org }) {
  const button = (
    <ActionButton
      accessibilityLabel={`Accept the invitation to ${props.org.name}`}
    >
      Accept invitation
    </ActionButton>
  )
  const to = orgLinks[props.org.key]
  if (!to) return button
  return (
    <ScreenLink asChild to={to}>
      {button}
    </ScreenLink>
  )
}

/**
 * The accept that failed: what failed, the message of the server, and Try
 * again, which joins the org.
 */
function AcceptFailure() {
  const button = <ActionButton tone="primary">Try again</ActionButton>
  const to = orgLinks[failedOrg.key]
  return (
    <Notice
      action={
        to ? (
          <ScreenLink asChild to={to}>
            {button}
          </ScreenLink>
        ) : (
          button
        )
      }
      body={offlineMessage}
      icon={CircleAlert}
      title={`The invitation to ${failedOrg.name} wasn't accepted`}
      tone="danger"
    />
  )
}

/**
 * The list that did not load, as the other lists of the app show it: what
 * failed, the message of the server, and Try again, which loads it again.
 */
function LoadFailure() {
  return (
    <Notice
      action={
        <ScreenLink asChild to={paths.invitations}>
          <ActionButton icon={RotateCw}>Try again</ActionButton>
        </ScreenLink>
      }
      body={offlineMessage}
      icon={TriangleAlert}
      title="The invitations didn't load"
      tone="danger"
    />
  )
}

/**
 * Continue to workspaces accepts nothing. The app then opens as the
 * sign-in would: a person without an org goes on to Get started.
 */
function ContinueLink() {
  return (
    <ScreenLink asChild to={paths.getStarted}>
      <ActionButton>Continue to workspaces</ActionButton>
    </ScreenLink>
  )
}

function inviteRows(): PendingInviteRow[] {
  return pendingInvites.map((invite) => {
    const org = orgs[invite.org]
    return {
      id: org.key,
      orgName: org.name,
      email: invite.email,
      accept: <Accept org={org} />,
    }
  })
}

/** The invitations with their intro, or the notice of a list that did not load. */
function Body(props: { state: InvitationsState; mobile: boolean }) {
  if (props.state.result === 'load-failed') return <LoadFailure />
  return (
    <>
      <p className={styles.intro}>Accept an invitation to join its org.</p>
      {props.state.result === 'accept-failed' ? <AcceptFailure /> : null}
      <PendingInviteList invites={inviteRows()} stacked={props.mobile} />
    </>
  )
}

/**
 * The invitations that wait after the GitHub sign-in, before the app opens
 * an org or Get started. Each org shows with the email that it invited,
 * and the person accepts each one. The person has no org yet, so the rail
 * is empty.
 */
export function InvitationsScreen(props: {
  state: InvitationsState
  viewport: Viewport
}) {
  const mobile = props.viewport === 'mobile'
  const page = (
    <Page
      actions={mobile ? <ContinueLink /> : undefined}
      subtitle={`@${account.login}`}
      title="Invitations"
      viewport={props.viewport}
    >
      <Body mobile={mobile} state={props.state} />
      {mobile ? null : (
        <div className={styles.actions}>
          <ContinueLink />
        </div>
      )}
    </Page>
  )
  if (mobile) return <MobileFrame>{page}</MobileFrame>
  return <AppFrame rail={{ orgs: [], firstRun: true }}>{page}</AppFrame>
}
