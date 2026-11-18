import { defineScreen } from '@mokly/mokly'
import {
  emptyDialog,
  NewWorkspaceDialogScreen,
  newWorkspaceDialogSchema,
} from '../../../../../screens/NewWorkspaceDialogScreen'

export const newWorkspaceDialogSection = defineScreen({
  title: 'Section menu',
  description:
    'The org and the section of the new workspace at the top right are a menu. The menu lists each section of the org in the order of the list, and it checks the current section, here General. A pick names the new section on the dialog, and Create puts the workspace in it. The menu has no Archived item, because Archived is a group of the list and not a section.',
  rationale:
    'The user asked on 12 November 2026 that the dialog can change the section of the new workspace, such as from General to another section, without Archived. The pick belongs to the draft, so the New workspace page of the same section names it too, and a close keeps it with the message. A create ends the pick, so the next draft starts in the section that opened it.',
  relatedDocs: [],
  propSchema: newWorkspaceDialogSchema,
  props: { ...emptyDialog, sectionMenu: 'open' },
  render: (props, context) => (
    <NewWorkspaceDialogScreen state={props} viewport={context.viewport} />
  ),
})
