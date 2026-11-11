import { defineScreen } from '@mokly/mokly'
import {
  WorkspaceListScreen,
  workspaceListSchema,
} from '../../../screens/WorkspaceListScreen'

export const orgs = defineScreen({
  title: 'Orgs',
  description:
    'On a phone, the org name at the top of the list opens the org switcher: every org, Create org, and the account. On desktop the rail is the switcher. When the pointer or the focus is on an org, the rail shows its name and the key that opens it, as small key chips: Futex is the second org, so its hint shows ⌃2. The switcher of a phone shows no keys.',
  rationale:
    'A phone has no rail, so the switcher takes its place. The account sits at the bottom of the rail and of the switcher, because the GitHub sign-in, the GitHub App, and the agents belong to every org. The hint is the tooltip of the tile, so it teaches the key of the org, as the Switch to row of the palette does. It shows the first key that works where the page runs, here a normal Chrome tab on a Mac. The keys count the orgs from the top of the rail: ⌃1 to ⌃9 on a Mac, and Alt+1 to Alt+9 on Windows. Waits on decision 21, drawn as its recommended option A.',
  relatedDocs: [],
  propSchema: workspaceListSchema,
  props: { list: 'workspaces', menu: 'orgs', palette: 'closed' },
  render: (props, context) => (
    <WorkspaceListScreen state={props} viewport={context.viewport} />
  ),
})
