import { defineComponent } from '@mokly/mokly'
import { ArchivedToast } from '../../../components/workspace/ArchivedToast'
import { savedCarts } from '../../../fixtures/workspaces'
import { phoneSchema } from '../common/ToastLayer.mockup'

/**
 * The toast just after Archive, registered with Mokly. A screen that draws
 * a screen of another viewport passes `phone`. Without it, a page of the
 * toast draws the layout of its view.
 */
export const archivedToast = defineComponent({
  slug: 'archived-toast',
  title: 'Archived toast',
  description:
    'The toast just after Archive, over the open workspace or over the list: it names the workspace and offers Restore, which does what Restore on the archived bar and on the row does. Its own page shows the toast of Saved carts.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['name'],
    properties: {
      /** The name of the workspace. */
      name: { type: 'string' },
      phone: phoneSchema,
    },
  } as const,
  props: { name: savedCarts.name },
  render: (props, context) => (
    <ArchivedToast
      name={props.name}
      phone={props.phone ?? context.viewport === 'mobile'}
    />
  ),
})
