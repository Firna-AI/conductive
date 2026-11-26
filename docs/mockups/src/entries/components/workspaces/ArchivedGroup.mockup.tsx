import { defineComponent } from '@mokly/mokly'
import { ArchivedGroup } from '../../../components/workspaces/ArchivedGroup'
import { archivedRows } from './listPages'
import { rowControlsSchema } from './rowSchemas'
import { workspaceRowSchema } from './workspaceSchemas'

/**
 * The Archived group at the end of the workspace list, registered with
 * Mokly. Its pages show the group open in the sidebar, collapsed with its
 * count, and open on the list page.
 */
export const archivedGroup = defineComponent({
  slug: 'archived-group',
  title: 'Archived group',
  description:
    "The archived workspaces at the end of the list. The group is the app's own, not a section of the user, so it has no menu, and it stays collapsed with its count until the user opens it. While the app keeps the cloud computer of a workspace, its row offers Restore on hover, except in a suspended org. Its own page shows the group open in the sidebar of Acme.",
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['rows', 'open', 'variant', 'readOnly'],
    properties: {
      rows: { type: 'array', items: workspaceRowSchema },
      open: { type: 'boolean' },
      variant: { enum: ['sidebar', 'page'] },
      /** A suspended org: no row offers Restore. */
      readOnly: { type: 'boolean' },
      /** The one row whose menu, field, or hover the view draws. */
      drawn: {
        type: 'object',
        additionalProperties: false,
        required: ['workspace', 'controls'],
        properties: {
          workspace: { type: 'string' },
          controls: rowControlsSchema,
        },
      },
    },
  } as const,
  props: {
    rows: archivedRows,
    open: true,
    variant: 'sidebar',
    readOnly: false,
  },
  render: (props) => (
    <ArchivedGroup
      drawn={props.drawn}
      open={props.open}
      readOnly={props.readOnly}
      rows={props.rows}
      variant={props.variant}
    />
  ),
  variants: [
    {
      slug: 'collapsed',
      title: 'Collapsed',
      description: 'The group before the user opens it, with its count.',
      props: { open: false },
    },
    {
      slug: 'page',
      title: 'On the list page',
      description: 'The group open on the list page, with taller rows.',
      props: { variant: 'page' },
    },
  ],
})
