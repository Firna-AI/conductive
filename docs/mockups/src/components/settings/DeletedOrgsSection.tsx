import { ArchiveRestore, CircleAlert } from 'lucide-react'
import { accountDeletedOrg, orgs } from '../../fixtures/orgs'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { Notice } from '../common/Notice'
import { ScreenLink } from '../common/ScreenLink'
import { OrgTile } from '../orgs/OrgTile'
import { DeletedOrgList } from './DeletedOrgList'
import { deletedOrgsCopy as copy } from './deletedOrgsCopy'

/**
 * The states of the Deleted orgs section: no deleted org, so the section
 * hides, an org to restore, an org that the operator suspended, or a
 * restore that failed.
 */
export const deletedOrgStates = [
  'none',
  'restorable',
  'suspended',
  'failed',
] as const

export type DeletedOrgState = (typeof deletedOrgStates)[number]

/**
 * The Deleted orgs section of the mockups, with Acme Labs. Restore leads to
 * `restoredTo`: by default the account without the section, because the
 * org is back in the rail.
 */
export function DeletedOrgsSection(props: {
  state: DeletedOrgState
  restoredTo?: string
}) {
  if (props.state === 'none') return null
  const org = orgs[accountDeletedOrg.org]
  const suspended = props.state === 'suspended'
  const day = accountDeletedOrg.deletes
  return (
    <DeletedOrgList
      rows={[
        {
          id: org.id,
          tile: <OrgTile org={org} size={26} />,
          name: org.name,
          detail: suspended ? copy.suspended(day) : copy.deletes(day),
          action: suspended ? undefined : (
            <ScreenLink asChild to={props.restoredTo ?? paths.account}>
              <ActionButton
                accessibilityLabel={copy.restoreLabel(org.name)}
                icon={ArchiveRestore}
              >
                {copy.restore}
              </ActionButton>
            </ScreenLink>
          ),
          error:
            props.state === 'failed' ? (
              <Notice
                body="The request failed. Try again."
                icon={CircleAlert}
                title={copy.failed(org.name)}
                tone="danger"
              />
            ) : undefined,
        },
      ]}
    />
  )
}
