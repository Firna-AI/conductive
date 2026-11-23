import { defineComponent, type SchemaProps } from '@mokly/mokly'
// The parts of a row come before the list, so that their styles keep their
// place in the screens that load the list.
import { actionButton } from '../common/actions.mockup'
import { notice } from '../common/Notice.mockup'
import { ScreenLink } from '../../../components/common/ScreenLink'
import { orgTile } from '../orgs/OrgTile.mockup'
import {
  DeletedOrgList,
  type DeletedOrgRow,
} from '../../../../../../src/ui/components/settings/DeletedOrgList'
import { deletedOrgsCopy as copy } from '../../../../../../src/ui/components/settings/deletedOrgsCopy'
import { accountDeletedOrg, orgs } from '../../../fixtures/orgs'
import { paths } from '../../../paths'
import { orgSchema } from '../layout/railSchemas'

/**
 * One deleted org as JSON, as `DeletedOrgRow` without its parts: the org,
 * whose tile and name show, the words under the name, the screen that
 * Restore opens, and the failure of the last restore.
 */
const rowSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['org', 'detail'],
  properties: {
    org: orgSchema,
    /** When everything is deleted, or why the org offers no restore. */
    detail: { type: 'string' },
    /** The screen that Restore opens. Without it, the row has no Restore. */
    restoreTo: { type: 'string', minLength: 1 },
    /** The failure of the last restore, under the row. */
    error: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'body'],
      properties: { title: { type: 'string' }, body: { type: 'string' } },
    },
  },
} as const

type Row = SchemaProps<typeof rowSchema>

/**
 * The row of the list from its data: the faded tile of the org, Restore,
 * and the notice of a failed restore, as the screens draw them.
 */
function rowOf(row: Row): DeletedOrgRow {
  const { org } = row
  return {
    id: org.id,
    tile: (
      <orgTile.Component
        moklyInstance={`tile-${org.key}`}
        org={org}
        size={26}
      />
    ),
    name: org.name,
    detail: row.detail,
    action: row.restoreTo ? (
      <ScreenLink asChild to={row.restoreTo}>
        <actionButton.Component
          accessibilityLabel={copy.restoreLabel(org.name)}
          icon="archive-restore"
          moklyInstance={`restore-${org.key}`}
        >
          {copy.restore}
        </actionButton.Component>
      </ScreenLink>
    ) : undefined,
    error: row.error ? (
      <notice.Component
        body={row.error.body}
        icon="circle-alert"
        moklyInstance={`restore-failed-${org.key}`}
        title={row.error.title}
        tone="danger"
      />
    ) : undefined,
  }
}

const labs = orgs[accountDeletedOrg.org]

/** The org of the account that the user can restore. */
const restorable = {
  org: labs,
  detail: copy.deletes(accountDeletedOrg.deletes),
  restoreTo: paths.account,
}

/**
 * The Deleted orgs section of the Account page, registered with Mokly. The
 * rows are data, and the adapter draws the tile, Restore, and the notice of
 * a failed restore of each row.
 */
export const deletedOrgList = defineComponent({
  slug: 'deleted-org-list',
  title: 'Deleted org list',
  description:
    'The Deleted orgs section of the Account page: each org that an admin deleted and that the user can still restore, with its tile faded as the rail drew it, the day when everything is deleted, and Restore. A suspended org offers no Restore and says why. A failed restore shows its notice under the row. The app shares it. Its own page shows Acme Labs with Restore.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['rows'],
    properties: { rows: { type: 'array', items: rowSchema } },
  } as const,
  props: { rows: [restorable] },
  render: (props) => <DeletedOrgList rows={props.rows.map(rowOf)} />,
  variants: [
    {
      slug: 'suspended',
      title: 'Suspended',
      description:
        'An org that the operator suspended: no Restore, and the words say why.',
      props: {
        rows: [
          { org: labs, detail: copy.suspended(accountDeletedOrg.deletes) },
        ],
      },
    },
    {
      slug: 'failed',
      title: 'Restore failed',
      description: 'A restore that failed: its notice under the row.',
      props: {
        rows: [
          {
            ...restorable,
            error: {
              title: copy.failed(labs.name),
              body: 'The request failed. Try again.',
            },
          },
        ],
      },
    },
  ],
})
