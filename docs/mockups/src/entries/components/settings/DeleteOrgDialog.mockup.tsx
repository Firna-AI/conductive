import { defineComponent } from '@mokly/mokly'
import { DeleteOrgDialog } from '../../../components/settings/DeleteOrgDialog'
import { viewports } from '../common/viewports'

/**
 * The question before Delete org, drawn open, registered with Mokly. A
 * screen that draws a screen of another viewport passes `viewport`.
 * Without it, a page of the dialog draws the layout of its own view.
 */
export const deleteOrgDialog = defineComponent({
  slug: 'delete-org-dialog',
  title: 'Delete org dialog',
  description:
    'The question before Delete org: what happens at once, the date when everything is deleted, and where an admin restores the org. An admin confirms by typing the name of the org, then Delete org. On a phone the dialog opens as a sheet.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      /** The viewport of the screen, when it differs from the view. */
      viewport: { enum: viewports },
    },
  } as const,
  render: (props, context) => (
    <DeleteOrgDialog viewport={props.viewport ?? context.viewport} />
  ),
})
