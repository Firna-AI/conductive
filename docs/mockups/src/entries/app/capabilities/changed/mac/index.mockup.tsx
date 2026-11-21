import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const capabilitiesChangedMac = defineScreen({
  title: 'Mac access on',
  description:
    'Cal asked for the checkout test in Safari on his Mac, and the workspace refused the command, because Mac access was off. After that turn, Priya turned Mac access on. The note also gives the rules of a Mac command: "Priya Raman turned Mac access on. Agents can ask to run commands on the Mac of the member whose message started the turn. The Mac app asks before each command, unless a permission that its user chose there covers it." No turn starts for the change.',
  rationale:
    'The note of Mac access on gives the same rules as the instructions of a new session, so each member who reads it knows whose Mac an agent can reach. The Mac app asks before each command, unless a permission that its user chose there covers it (decision 62). Such a permission is Always allow for one command, or a permission for all commands from the workspace, for 15 minutes or until Stop. The note names no single permission, so it stays true for each of them. The note of Mac access off has no rules: "Priya Raman turned Mac access off."',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, conversation: 'capabilities-changed-mac' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
