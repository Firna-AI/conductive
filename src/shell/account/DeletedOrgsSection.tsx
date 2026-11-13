import { useState } from 'react'
import { ArchiveRestore, CircleAlert } from 'lucide-react'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import {
  DeletedOrgList,
  type DeletedOrgRow,
} from '../../../docs/mockups/src/components/settings/DeletedOrgList'
import { deletedOrgsCopy as copy } from '../../../docs/mockups/src/components/settings/deletedOrgsCopy'
import { isSuspended } from '../../app/permissions'
import { useServices } from '../../app/services'
import { useStore } from '../../app/store'
import { errorMessage } from '../../members/api/client'
import { deletionDay } from '../../members/time'
import { useMountedRef } from '../../members/useMounted'
import type { OrgSummary } from '../../shared/orgs'
import { useApp } from '../context'
import { membersApiOf } from '../settings/members-api'
import { ActionButton } from '../ui/actions'
import { OrgTile } from '../ui/Avatars'

/** A Restore that runs, or the error of the last one that failed. */
type Restore = { busy: true } | { busy: false; error: string }

/**
 * Deleted orgs: each deleted org that the user can see, which only its
 * admins can. The last section of the General tab shows it, and Get
 * started shows it before its steps. The rail leaves these orgs out. An
 * admin restores an org until everything of it is deleted, and the org
 * goes back to the rail. `onRestored` then gets the org, after the org
 * list has it. A suspended org refuses a restore, so its row offers none.
 * The section shows only while the user has a deleted org.
 */
export function DeletedOrgsSection(props: {
  onRestored?: (org: OrgSummary) => void
}) {
  const app = useApp()
  const orgs = useStore(app.orgs)
  const refused = useStore(app.refusedOrgs)
  const { timeZone } = useServices()
  const mounted = useMountedRef()
  const [restores, setRestores] = useState<ReadonlyMap<string, Restore>>(
    () => new Map(),
  )
  const deleted = orgs.filter((org) => org.deletion)
  if (deleted.length === 0) return null

  const put = (orgId: string, restore: Restore | null) =>
    setRestores((current) => {
      const next = new Map(current)
      if (restore) next.set(orgId, restore)
      else next.delete(orgId)
      return next
    })

  async function restore(org: OrgSummary) {
    put(org.id, { busy: true })
    try {
      const restored = await membersApiOf(app.org(org.id)).restoreOrg(org.id)
      // The org is back on the server, so the list takes it also after an
      // unmount of the page.
      app.putOrg(restored)
      if (mounted.current) {
        put(org.id, null)
        props.onRestored?.(restored)
      }
    } catch (reason) {
      if (mounted.current) {
        put(org.id, { busy: false, error: errorMessage(reason) })
      }
    }
  }

  const rows = deleted.map((org): DeletedOrgRow => {
    const day = deletionDay(org.deletion?.deletesAt ?? 0, timeZone)
    const suspended = isSuspended(org, refused)
    const state = restores.get(org.id)
    return {
      id: org.id,
      tile: <OrgTile org={org} size={26} />,
      name: org.name,
      detail: suspended ? copy.suspended(day) : copy.deletes(day),
      action:
        org.role === 'admin' && !suspended ? (
          <ActionButton
            accessibilityLabel={copy.restoreLabel(org.name)}
            busy={state?.busy === true}
            icon={ArchiveRestore}
            onPress={() => void restore(org)}
          >
            {copy.restore}
          </ActionButton>
        ) : undefined,
      error:
        state && !state.busy ? (
          <Notice
            body={state.error}
            icon={CircleAlert}
            title={copy.failed(org.name)}
            tone="danger"
          />
        ) : undefined,
    }
  })
  return <DeletedOrgList rows={rows} />
}
