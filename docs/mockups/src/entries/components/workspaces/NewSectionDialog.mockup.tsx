import { defineComponent } from '@mokly/mokly'
import { NewSectionDialog } from '../../../components/workspaces/NewSectionDialog'
import { viewports } from '../common/viewports'

/**
 * New section, drawn open, registered with Mokly. A screen that draws a
 * screen of another viewport passes `viewport`. Without it, a page of the
 * dialog draws the layout of its own view.
 */
export const newSectionDialog = defineComponent({
  slug: 'new-section-dialog',
  title: 'New section dialog',
  description:
    'The dialog of New section, which asks for the name of the section: its Name field, then Cancel and Create section. Create section stays off until the name holds text. A failed create shows its message below the field, and the dialog keeps the name. On a phone the dialog opens as a sheet. Its own page shows the dialog with a name.',
  relatedDocs: ['docs/mockups/catalogue.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      /** The name in the field. */
      name: { type: 'string' },
      /** The message of a create that failed. */
      failed: { type: 'string' },
      /** The viewport of the screen, when it differs from the view. */
      viewport: { enum: viewports },
    },
  } as const,
  props: { name: 'Payments' },
  render: (props, context) => (
    <NewSectionDialog
      failed={props.failed}
      name={props.name}
      viewport={props.viewport ?? context.viewport}
    />
  ),
  variants: [
    {
      slug: 'failed',
      title: 'Create failed',
      description:
        'The create failed: a notice below the field names the failure, and the dialog keeps the name.',
      props: {
        failed:
          "The app can't reach the server. Check the connection, then try again.",
      },
    },
    {
      slug: 'empty',
      title: 'No name',
      description: 'The field is empty, so Create section is off.',
      props: { name: '' },
    },
  ],
})
