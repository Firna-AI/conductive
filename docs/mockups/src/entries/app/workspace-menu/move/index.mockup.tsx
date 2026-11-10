import { defineScreen } from '@mokly/mokly'
import {
  WorkspaceListScreen,
  workspaceListSchema,
} from '../../../../screens/WorkspaceListScreen'

export const workspaceMenuMove = defineScreen({
  title: 'Move to section',
  description:
    'Move to section opens the sections of Acme beside the menu, with Checkout, the section of Apple Pay button, checked. Another section takes the workspace to its top, and Checkout changes nothing. The collapsed Infra section is a choice too. On a phone the sheet shows the sections in place of the menu.',
  rationale:
    'The menu moves a workspace as a drag does, with the same rules: every member of the org moves workspaces. A move from the menu has no place in the target section, so the workspace goes to its top, as a write without a place does today.',
  relatedDocs: [],
  propSchema: workspaceListSchema,
  props: { list: 'workspaces', menu: 'workspace-move', palette: 'closed' },
  render: (props, context) => (
    <WorkspaceListScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'general-only',
      title: 'Only General',
      description:
        'Acme after an admin deleted Checkout and Infra, which moved their workspaces to General. With one section, the menu of Apple Pay button has no Move to section: Reassign to, Rename, a line, then Archive.',
      rationale:
        'A move needs another section, and the menu hides an action that the person cannot use. A new org also starts with General only.',
      props: { list: 'general-only', menu: 'workspace' },
    },
  ],
})
