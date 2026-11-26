import { accountDeletedOrg, orgs } from '../../fixtures/orgs'
import { paths } from '../../paths'
import { deletedOrgList } from '../../entries/components/settings/DeletedOrgList.mockup'
import { deletedOrgsCopy as copy } from '../../../../../src/ui/components/settings/deletedOrgsCopy'

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
  // The list draws the tile, Restore, and the notice of each row from data.
  return (
    <deletedOrgList.Component
      moklyInstance="list"
      rows={[
        {
          org,
          detail: suspended ? copy.suspended(day) : copy.deletes(day),
          ...(suspended
            ? {}
            : { restoreTo: props.restoredTo ?? paths.account }),
          ...(props.state === 'failed'
            ? {
                error: {
                  title: copy.failed(org.name),
                  body: 'The request failed. Try again.',
                },
              }
            : {}),
        },
      ]}
    />
  )
}
