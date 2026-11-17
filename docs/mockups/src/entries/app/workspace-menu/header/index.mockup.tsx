import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const workspaceMenuHeader = defineScreen({
  title: 'The workspace menu in the header',
  description:
    'A press on the name of Checkout address autocomplete in its header opens the menu of its row below the name: Move to section, Reassign to, Rename, Copy link, a line, then Archive. The name shows no caret. It looks like the name, and only a hover or a press shows that it is a button. The menu shows the actions that the person can use, as the menu of the row does. On a phone the menu opens as a sheet.',
  rationale:
    'Cal asked on 17 November 2026 for the workspace menu of the list in the header, and then chose a press on the name. A right click on the bar was rejected, because the Mac app moves its window by the bar, so the page never hears a right click there. The name is a button, so it takes its press in the Mac app too. The header uses the one list of actions of the row menu, so the two menus never differ.',
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
        'The field opens in place of the name that opened the menu, as Rename of a row opens its field in the row. It works as the field of the row.',
      props: { overlay: 'header-rename' },
    },
  ],
})
