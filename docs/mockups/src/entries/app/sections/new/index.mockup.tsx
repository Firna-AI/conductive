import { defineScreen } from '@mokly/mokly'
import { NewSectionDialog } from '../../../../components/workspaces/NewSectionDialog'
import { WorkspaceListScreen } from '../../../../screens/WorkspaceListScreen'

const newSectionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['from'],
  properties: {
    /** The menu of Checkout or the command palette, which opened the dialog. */
    from: { enum: ['menu', 'palette'] },
  },
} as const

export const sectionsNew = defineScreen({
  title: 'New section',
  description:
    'New section in the menu of Checkout opens a dialog over the list. The dialog says that the new section goes below Checkout, and its Name field takes the focus. Enter or Create section creates the section directly below Checkout. Create section stays off until the name holds text. Cancel, Escape, or a click outside closes the dialog and creates nothing. A failure shows in the dialog, and the dialog keeps the name. On a phone the dialog opens as a sheet.',
  rationale:
    'The user asked on 16 November 2026 for the name of a new section in a dialog, and for the new section to go below the section whose menu opened it. Before, a field opened at the end of the list, far from the menu, and the new section went to the end.',
  relatedDocs: [],
  propSchema: newSectionSchema,
  props: { from: 'menu' },
  render: (props, context) => (
    <WorkspaceListScreen
      overlay={
        props.from === 'menu' ? (
          <NewSectionDialog
            below="Checkout"
            name="Payments"
            viewport={context.viewport}
          />
        ) : (
          <NewSectionDialog viewport={context.viewport} />
        )
      }
      state={{ list: 'workspaces', menu: 'none', palette: 'closed' }}
      viewport={context.viewport}
    />
  ),
  variants: [
    {
      slug: 'palette',
      title: 'From the command palette',
      description:
        'New section in the command palette opens the same dialog. No section opened it, so the dialog says that the new section goes at the end of the list. The field is empty, so Create section is off.',
      props: { from: 'palette' },
    },
  ],
})
