import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { Org } from '../shared/api'
import type { OrgSummary } from '../shared/orgs'
import { errorMessage, type MembersApi } from './api/client'
import { DeleteOrgDialog } from './DeleteOrgDialog'
import { deletionTime, RESTORE_DAYS } from './time'
import { useMountedRef } from './useMounted'
import { ActionButton } from './ui/actions'
import { ViewportScope, type Viewport } from './ui/controls'
import { Section } from './ui/Section'

export type DeleteOrgSectionProps = {
  api: MembersApi
  /** The org, with the role of the signed-in person. */
  org: Org
  viewport: Viewport
  /** The time now, in Unix milliseconds, for the date in the question. */
  now: number
  timeZone?: string
  /** The org is deleted. Its `deletion` says when everything goes. */
  onDeleted: (org: OrgSummary) => void
}

/**
 * Delete org, for the General tab of an admin (decision 30). Every cloud
 * computer stops and the org hides at once, and everything is deleted after
 * 7 days unless an admin restores it. It renders nothing for a member who is
 * not an admin. It keys its state to the org, so another org never gets an
 * open question, and an old answer calls no callback.
 */
export function DeleteOrgSection(props: DeleteOrgSectionProps) {
  if (props.org.role !== 'admin') return null
  return <AdminDeleteOrg key={props.org.id} {...props} />
}

function AdminDeleteOrg(props: DeleteOrgSectionProps) {
  const mounted = useMountedRef()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { api, org } = props

  async function confirm(name: string) {
    setBusy(true)
    setError(null)
    try {
      const deleted = await api.deleteOrg(org.id, { name })
      if (!mounted.current) return
      setOpen(false)
      props.onDeleted(deleted)
    } catch (reason) {
      if (mounted.current) setError(errorMessage(reason))
    } finally {
      if (mounted.current) setBusy(false)
    }
  }

  return (
    <ViewportScope viewport={props.viewport}>
      <Section
        actions={
          <ActionButton
            icon={Trash2}
            onPress={() => {
              setError(null)
              setOpen(true)
            }}
            tone="danger"
          >
            Delete org
          </ActionButton>
        }
        description={`Stops every cloud computer of ${org.name} and hides it from its members. Everything is deleted after ${RESTORE_DAYS} days, unless an admin restores it.`}
        title="Delete org"
      />
      {open ? (
        <DeleteOrgDialog
          busy={busy}
          deletesAt={deletionTime(props.now)}
          error={error}
          onCancel={() => setOpen(false)}
          onConfirm={(name) => void confirm(name)}
          orgName={org.name}
          timeZone={props.timeZone}
        />
      ) : null}
    </ViewportScope>
  )
}
