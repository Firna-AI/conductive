import type { SchemaProps, Viewport } from '@mokly/mokly'
import { actionButton } from '../entries/components/common/actions.mockup'
import { offlineMessage } from '../components/common/LoadFailure'
import { loadFailure } from '../entries/components/common/LoadFailure.mockup'
import { notice } from '../entries/components/common/Notice.mockup'
import { ScreenLink } from '../components/common/ScreenLink'
import {
  appFrame,
  mobileFrame,
} from '../entries/components/layout/AppFrame.mockup'
import { page as pagePart } from '../entries/components/layout/Page.mockup'
import { pendingInviteList } from '../entries/components/members/PendingInvites.mockup'
import { orgLinks } from '../components/orgs/orgLinks'
import { pendingInvites } from '../fixtures/members'
import { account, orgs } from '../fixtures/orgs'
import { paths } from '../paths'
import { inviteRows } from './inviteRows'
import { defined } from '../defined'
import styles from '../../../../src/ui/screens/InvitationsScreen.module.css'

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

/**
 * The accept that failed: what failed, the message of the server, and Try
 * again, which joins the org.
 */
function AcceptFailure() {
  const button = (
    <actionButton.Component moklyInstance="try-again" tone="primary">
      Try again
    </actionButton.Component>
  )
  const to = orgLinks[failedOrg.key]
  return (
    <notice.Component
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
      icon="circle-alert"
      moklyInstance="accept-failed"
      title={`The invitation to ${failedOrg.name} wasn't accepted`}
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
      <actionButton.Component moklyInstance="continue-to-workspaces">
        Continue to workspaces
      </actionButton.Component>
    </ScreenLink>
  )
}

/** The invitations with their intro, or the notice of a list that did not load. */
function Body(props: { state: InvitationsState; mobile: boolean }) {
  if (props.state.result === 'load-failed') {
    return (
      <loadFailure.Component
        moklyInstance="invitations-load-failure"
        title="The invitations didn't load"
        to={paths.invitations}
      />
    )
  }
  return (
    <>
      <p className={styles.intro}>Accept an invitation to join its org.</p>
      {props.state.result === 'accept-failed' ? <AcceptFailure /> : null}
      <pendingInviteList.Component
        invites={inviteRows(pendingInvites)}
        moklyInstance="invitations"
        stacked={props.mobile}
      />
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
    <pagePart.Component
      subtitle={`@${account.login}`}
      {...defined({ actions: mobile ? <ContinueLink /> : undefined })}
      title="Invitations"
      viewport={props.viewport}
    >
      <Body mobile={mobile} state={props.state} />
      {mobile ? null : (
        <div className={styles.actions}>
          <ContinueLink />
        </div>
      )}
    </pagePart.Component>
  )
  if (mobile) return <mobileFrame.Component>{page}</mobileFrame.Component>
  return (
    <appFrame.Component rail={{ orgs: [], firstRun: true }}>
      {page}
    </appFrame.Component>
  )
}
