import { defineComponent } from '@mokly/mokly'
import { WorkspaceRowView } from '../../../components/workspaces/WorkspaceRow'
import { checkoutAutocomplete } from '../../../fixtures/workspaces'
import { acmeRow } from './listPages'
import { rowControlsSchema } from './rowSchemas'
import { workspaceRowSchema } from './workspaceSchemas'

/** The open workspace of Acme while its agent works. */
const openRow = {
  workspace: { ...checkoutAutocomplete, updated: 'now' },
  status: 'working',
  github: 'ready-to-merge',
  selected: true,
} as const

/**
 * One workspace on one line of the list, registered with Mokly. Its pages
 * show the row of the open workspace, a row on the list page, the hover
 * with Archive, the copy that a drag lifts, and the field of Rename.
 */
export const workspaceRow = defineComponent({
  slug: 'workspace-row-view',
  title: 'Workspace row',
  description:
    'One workspace on one line of the list: its list mark, its name, and the time since its last activity. A bold name is output that the user has not read, and a dim name a stopped sandbox. The action of the row, Archive or Restore, covers the time on hover. A nested row indents under the rows of its tree, and a row of a tree draws the guide lines of its tree. A drag lifts the row and leaves a faint copy behind, and a lifted row of a tree shows the count of the rows that move with it in place of its time. A right click opens its menu at the pointer, and Rename puts a field in place of the name. Its own page shows the row of the open workspace in the sidebar while its agent works.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['row', 'variant'],
    properties: {
      row: workspaceRowSchema,
      /** The compact row of the sidebar, or the taller row of the page. */
      variant: { enum: ['sidebar', 'page'] },
      drag: { enum: ['lifted', 'placeholder'] },
      /** The nested rows that move with a lifted row of a tree. */
      carried: { type: 'integer', minimum: 0 },
      /** The row offers Archive on hover. */
      archivable: { type: 'boolean' },
      /** An archived row offers Restore on hover. */
      restorable: { type: 'boolean' },
      controls: rowControlsSchema,
    },
  } as const,
  props: { row: openRow, variant: 'sidebar', archivable: true },
  render: (props) => (
    <WorkspaceRowView
      archivable={props.archivable}
      carried={props.carried}
      controls={props.controls}
      drag={props.drag}
      restorable={props.restorable}
      row={props.row}
      variant={props.variant}
    />
  ),
  variants: [
    {
      slug: 'page',
      title: 'On the list page',
      description:
        'A taller row of the list page, for touch, with output that the user has not read.',
      props: { row: acmeRow('webhook-retries'), variant: 'page' },
    },
    {
      slug: 'hover',
      title: 'Hover',
      description:
        'The pointer over the row of a stopped sandbox: the fill of a hover, and Archive over the time.',
      props: {
        row: acmeRow('checkout-autocomplete'),
        controls: { hovered: true },
      },
    },
    {
      slug: 'lifted',
      title: 'Lifted by a drag',
      description: 'The copy of a row that a drag lifts under the pointer.',
      props: { row: acmeRow('webhook-retries'), drag: 'lifted' },
    },
    {
      slug: 'rename',
      title: 'Rename',
      description:
        'The field of Rename in place of the name and the time, with the name selected.',
      props: {
        controls: {
          rename: { value: checkoutAutocomplete.name, selected: true },
        },
      },
    },
  ],
})
