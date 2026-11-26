import { defineComponent } from '@mokly/mokly'
import { RemoveMemberDialog } from '../../../components/members/RemoveMemberDialog'
import { viewports } from '../common/viewports'

/**
 * The question before an admin removes a member, drawn open, registered
 * with Mokly. A screen that draws a screen of another viewport passes
 * `viewport`. Without it, a page of the dialog draws the layout of its own
 * view.
 */
export const removeMemberDialog = defineComponent({
  slug: 'remove-member-dialog',
  title: 'Remove member dialog',
  description:
    "The question before an admin removes a member from the org: the member can no longer open the org, and the member's workspaces move to the admin, so no workspace is left without an owner. On a phone the dialog opens as a sheet. Its own page shows the removal of Priya.",
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
    <RemoveMemberDialog viewport={props.viewport ?? context.viewport} />
  ),
})
