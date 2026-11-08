import { useEffect, useRef } from 'react'
import { CircleAlert } from 'lucide-react'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import {
  PendingInviteList,
  type PendingInviteRow,
} from '../../../docs/mockups/src/components/members/PendingInvites'
import styles from '../../../docs/mockups/src/screens/InvitationsScreen.module.css'
import type { Invitations } from '../../app/invitations-model'
import { useNavigation } from '../../app/navigation'
import { routes } from '../../app/router'
import { useStore } from '../../app/store'
import type { User } from '../../shared/api'
import type { PendingOrgInvite } from '../../shared/members'
import { useApp } from '../context'
import { Page } from '../layout/Page'
import { ActionButton } from '../ui/actions'
import { LoadFailure } from '../ui/LoadFailure'
import { useViewport } from '../ui/viewport'

/** Whether the screen still shows, so that a late answer opens no org. */
function useShown() {
  const shown = useRef(false)
  useEffect(() => {
    shown.current = true
    return () => {
      shown.current = false
    }
  }, [])
  return shown
}

/**
 * The invitations with their intro and the failure of the last acceptance,
 * or the failure of a list that did not load.
 */
function Body(props: { state: Invitations; phone: boolean }) {
  const { invitations } = useApp()
  const navigation = useNavigation()
  const shown = useShown()
  const { list, accepting, failure } = props.state
  if (list?.state === 'failed') {
    return (
      <LoadFailure
        error={list.error}
        retry={() => invitations.read()}
        title="The invitations didn't load"
      />
    )
  }
  const accept = (invite: PendingOrgInvite) =>
    void invitations.accept(invite, (org) => {
      if (shown.current) navigation.replace(routes.org(org.id))
    })
  const rows: PendingInviteRow[] = (
    list?.state === 'ready' ? list.value : []
  ).map((invite) => ({
    id: invite.id,
    orgName: invite.orgName,
    email: invite.email,
    accept: (
      <ActionButton
        accessibilityLabel={`Accept the invitation to ${invite.orgName}`}
        busy={accepting === invite.id}
        disabled={accepting !== null && accepting !== invite.id}
        onPress={() => accept(invite)}
      >
        Accept invitation
      </ActionButton>
    ),
  }))
  return (
    <>
      <p className={styles.intro}>Accept an invitation to join its org.</p>
      {failure ? (
        <Notice
          action={
            <ActionButton
              disabled={accepting !== null}
              onPress={() => accept(failure.invite)}
              tone="primary"
            >
              Try again
            </ActionButton>
          }
          body={failure.error.message}
          icon={CircleAlert}
          title={`The invitation to ${failure.invite.orgName} wasn't accepted`}
          tone="danger"
        />
      ) : null}
      <PendingInviteList invites={rows} stacked={props.phone} />
    </>
  )
}

/**
 * The invitations that wait for the signed-in user, before the app opens an
 * org or Get started (decision 78). Each org shows with the email that it
 * invited, and the user accepts each one. An acceptance opens its org.
 * Continue to workspaces accepts nothing, and the app opens as usual. A
 * list that did not load shows with Try again and Continue to workspaces.
 */
export function InvitationsScreen(props: { user: User }) {
  const { invitations } = useApp()
  const state = useStore(invitations.state)
  const phone = useViewport() === 'phone'
  const next = (
    <ActionButton
      disabled={state.accepting !== null}
      onPress={() => invitations.pass()}
    >
      Continue to workspaces
    </ActionButton>
  )
  return (
    <Page
      actions={phone ? next : undefined}
      subtitle={`@${props.user.githubLogin}`}
      title="Invitations"
    >
      <Body phone={phone} state={state} />
      {phone ? null : <div className={styles.actions}>{next}</div>}
    </Page>
  )
}
