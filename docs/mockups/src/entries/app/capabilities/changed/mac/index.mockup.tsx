import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const capabilitiesChangedMac = defineScreen({
  title: 'Mac access on',
  description:
    'Cal asked for the checkout test in Safari on his Mac, and the workspace refused the command, because Mac access was off. After that turn, Priya turned Mac access on. The note also gives the rules of a Mac command: "Priya Raman turned Mac access on. Agents can ask to run commands on the Mac of the member whose message started the turn. The Mac app still asks before each command that its user did not always allow." No turn starts for the change.',
  rationale:
    'The note of Mac access on gives the same rules as the instructions of a new session, so each member who reads it knows whose Mac an agent can reach. The Mac app still asks before each command that its user did not always allow (decision 62). The note of Mac access off has no rules: "Priya Raman turned Mac access off."',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, conversation: 'capabilities-changed-mac' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
