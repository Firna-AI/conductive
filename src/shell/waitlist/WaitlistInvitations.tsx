import { CircleAlert, CirclePause } from 'lucide-react'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import {
  PendingInviteList,
  type PendingInviteRow,
} from '../../../docs/mockups/src/components/members/PendingInvites'
import styles from '../../../docs/mockups/src/screens/WaitlistScreen.module.css'
import { waitlistCopy as copy } from '../../../docs/mockups/src/screens/waitlistCopy'
import type { Opener, Waitlist } from '../../app/waitlist-state'
import type { PendingOrgInvite } from '../../shared/members'
import { useApp } from '../context'
import { ActionButton } from '../ui/actions'
import { LoadFailure } from '../ui/LoadFailure'
import { useViewport } from '../ui/viewport'

/**
 * The org invitations of the person, above the code field, with Accept
 * invitation as the main action. An Accept joins the org and lets the
 * person in, and the org opens. When the pause of sign-ups stopped Accept,
 * a notice above the rows says that the invitation stays. Another failed
 * Accept shows its cause with Try again, as on the invitations of `/`.
 * Without invitations the block shows nothing.
 */
export function WaitlistInvitations(props: { state: Waitlist; open: Opener }) {
  const { waitlist } = useApp()
  const phone = useViewport() === 'phone'
  const { invitations, accepting, acceptFailure, acceptPaused } = props.state
  if (invitations?.state === 'failed') {
    return (
      <LoadFailure
        error={invitations.error}
        retry={() => waitlist.readInvitations()}
        title="The invitations didn't load"
      />
    )
  }
  if (invitations?.state !== 'ready' || invitations.value.length === 0) {
    return null
  }
  const accept = (invite: PendingOrgInvite) =>
    void waitlist.accept(invite, props.open)
  const rows: PendingInviteRow[] = invitations.value.map((invite) => ({
    id: invite.id,
    orgName: invite.orgName,
    email: invite.email,
    accept: (
      <ActionButton
        accessibilityLabel={`Accept the invitation to ${invite.orgName}`}
        busy={accepting === invite.id}
        disabled={accepting !== null && accepting !== invite.id}
        onPress={() => accept(invite)}
        tone="primary"
      >
        Accept invitation
      </ActionButton>
    ),
  }))
  return (
    <div className={styles.invitations}>
      <p className={styles.intro}>{copy.invitations}</p>
      {acceptPaused ? (
        <Notice
          body={copy.paused.invitation}
          icon={CirclePause}
          title={copy.paused.title}
        />
      ) : null}
      {acceptFailure ? (
        <Notice
          action={
            <ActionButton
              disabled={accepting !== null}
              onPress={() => accept(acceptFailure.invite)}
              tone="primary"
            >
              Try again
            </ActionButton>
          }
          body={acceptFailure.error.message}
          icon={CircleAlert}
          title={`The invitation to ${acceptFailure.invite.orgName} wasn't accepted`}
          tone="danger"
        />
      ) : null}
      <PendingInviteList invites={rows} stacked={phone} />
    </div>
  )
}
