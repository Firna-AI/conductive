import { defineScreen } from '@mokly/mokly'
import { newSectionDialog } from '../../../components/workspaces/NewSectionDialog.mockup'
import { WorkspaceListScreen } from '../../../../screens/WorkspaceListScreen'
import { defined } from '../../../../defined'

const newSectionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['from'],
  properties: {
    /**
     * The dialog from the menu of Checkout, the same dialog after its
     * create failed, or the dialog from the command palette.
     */
    from: { enum: ['menu', 'failed', 'palette'] },
  },
} as const

export const sectionsNew = defineScreen({
  title: 'New section',
  description:
    'New section in the menu of Checkout opens a dialog over the list. Its Name field takes the focus. Enter or Create section creates the section directly below Checkout. Create section stays off until the name holds text. Cancel, Escape, or a click outside closes the dialog and creates nothing. A failure shows in the dialog, and the dialog keeps the name. On a phone the dialog opens as a sheet.',
  rationale:
    'The user asked on 16 November 2026 for the name of a new section in a dialog, and for the new section to go below the section whose menu opened it. Before, a field opened at the end of the list, far from the menu, and the new section went to the end.',
  relatedDocs: [],
  propSchema: newSectionSchema,
  props: { from: 'menu' },
  render: (props, context) => (
    <WorkspaceListScreen
      overlay={
        props.from === 'palette' ? (
          <newSectionDialog.Component
            moklyInstance="new-section-dialog"
            viewport={context.viewport}
          />
        ) : (
          <newSectionDialog.Component
            moklyInstance="new-section-dialog"
            name="Payments"
            viewport={context.viewport}
            {...defined({
              failed:
                props.from === 'failed'
                  ? "The app can't reach the server. Check the connection, then try again."
                  : undefined,
            })}
          />
        )
      }
      state={{ list: 'workspaces', menu: 'none', palette: 'closed' }}
      viewport={context.viewport}
    />
  ),
  variants: [
    {
      slug: 'failed',
      title: 'Create failed',
      description:
        'The create of Payments failed, because the app could not reach the server. A notice below the field names the failure with the message of the app. The dialog stays open and keeps the name, so Create section or Enter tries again, and Cancel closes it.',
      rationale:
        'The failure shows beside the name that the user typed, so nothing needs to be typed again. Before, a failed create showed only a toast, and the field was gone.',
      props: { from: 'failed' },
    },
    {
      slug: 'palette',
      title: 'From the command palette',
      description:
        'New section in the command palette opens the same dialog. No section opened it, so the new section goes at the end of the list. The field is empty, so Create section is off.',
      props: { from: 'palette' },
    },
  ],
})
