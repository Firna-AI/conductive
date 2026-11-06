import { useState } from 'react'
import { ArchiveRestore, CircleAlert } from 'lucide-react'
import type { OrgSummary } from '../shared/orgs'
import { errorMessage, type MembersApi } from './api/client'
import { deletionDay } from './time'
import { useMountedRef } from './useMounted'
import { ActionButton } from './ui/actions'
import { ViewportScope, type Viewport } from './ui/controls'
import { EmptyState } from './ui/EmptyState'
import { Notice } from './ui/Notice'
import styles from './DeletedOrgPage.module.css'

export type DeletedOrgPageProps = {
  api: MembersApi
  /** The deleted org, with the role of the signed-in person. */
  org: OrgSummary
  viewport: Viewport
  timeZone?: string
  /** The org is back. The shell shows it as an active org again. */
  onRestored: (org: OrgSummary) => void
}

/**
 * The page of an org that an admin deleted. Its cloud computers are stopped
 * and its members cannot open it. An admin restores it until the date of
 * `deletion.deletesAt`. Restore brings the org back as it was, and its
 * workspaces start again only when they open. Only an admin gets Restore.
 * Mount it in the main area of the app, which it fills. It keys its state
 * to the org and the viewer's role, so an error of one org never shows on
 * another, and an old answer calls no callback.
 */
export function DeletedOrgPage(props: DeletedOrgPageProps) {
  const { org } = props
  return <DeletedOrg key={`${org.id}/${org.role}`} {...props} />
}

function DeletedOrg(props: DeletedOrgPageProps) {
  const mounted = useMountedRef()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { api, org } = props
  const admin = org.role === 'admin'
  const title = org.deletion
    ? `${org.name} is deleted on ${deletionDay(org.deletion.deletesAt, props.timeZone)}`
    : `${org.name} is deleted`

  async function restore() {
    setBusy(true)
    setError(null)
    try {
      const restored = await api.restoreOrg(org.id)
      if (mounted.current) props.onRestored(restored)
    } catch (reason) {
      if (mounted.current) setError(errorMessage(reason))
    } finally {
      if (mounted.current) setBusy(false)
    }
  }

  return (
    <ViewportScope viewport={props.viewport}>
      <EmptyState
        action={
          admin ? (
            <ActionButton
              busy={busy}
              icon={ArchiveRestore}
              onPress={() => void restore()}
              tone="primary"
            >
              {`Restore ${org.name}`}
            </ActionButton>
          ) : undefined
        }
        body={
          admin
            ? "Its cloud computers are stopped, and its members can't open it. Restore it to bring back its workspaces, chats, and settings."
            : 'Its cloud computers are stopped. An admin can restore it until then.'
        }
        icon={ArchiveRestore}
        title={title}
      >
        {error ? (
          <div className={styles.error}>
            <Notice
              body={error}
              icon={CircleAlert}
              title={`${org.name} was not restored`}
              tone="danger"
            />
          </div>
        ) : null}
      </EmptyState>
    </ViewportScope>
  )
}
