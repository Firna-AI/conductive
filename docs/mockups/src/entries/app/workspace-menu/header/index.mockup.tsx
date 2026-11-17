import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const workspaceMenuHeader = defineScreen({
  title: 'The workspace menu in the header',
  description:
    'A right click on the header of Checkout address autocomplete, such as on its name or its repository, opens the menu of its row at the pointer: Move to section, Reassign to, Rename, Copy link, a line, then Archive. A right click on the label of the number, the owner, the state, or the toggle of the right column opens no workspace menu. The menu shows the actions that the person can use, as the menu of the row does. On a phone the menu opens as a sheet.',
  rationale:
    'Cal asked on 17 November 2026 that a right click on the header bar, outside its other controls, opens the workspace menu of the list. The header uses the one list of actions of the row menu, so the two menus never differ. The controls of the header keep their own press.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, overlay: 'workspace-menu' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'rename',
      title: 'Rename in the header',
      description:
        'Rename in the menu of the header turns the name in the header into a field, with the name selected, so typing replaces it. Enter or a click outside the field saves the name, and Escape keeps the old one. The row in the list takes the new name too.',
      rationale:
        'The field opens where the person clicked, as Rename of a row opens its field in the row. It works as the field of the row.',
      props: { overlay: 'header-rename' },
    },
  ],
})
