import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  checksWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const gitHubBanner = defineScreen({
  title: 'GitHub banner',
  description:
    'The branch has commits but no pull request yet: the agent was stopped before it opened one. The pull request bar shows the branch and its target, and Create PR, which asks the agent to open the pull request. On desktop, the tooltip of Create PR says “Create PR (⇧⌘P)”: each button and each link to the pull request names the key of its command, while it takes a click. The Checks tab waits for a pull request. On a phone the row opens the Checks tab, whose top holds the same actions. The child pages show the other states of decisions 18 and 64, and the actions of each state.',
  rationale:
    'The pull request bar sits at the top of the right column, above the Checks tab, which lists each check that GitHub reports. On a phone a compact row at the top of the workspace opens the Checks tab, and the actions of the bar stand at the top of that tab, because a button cannot sit inside the link of the row. Status uses an icon and words, never only a colour, and a state tints the whole bar, never one edge. The user chose decision 220: the agent gets a fixed prompt for each step that changes code, and the app merges, continues, and archives. Each state shows one main action, and the number of a pull request opens it on GitHub. Beside an action, a narrow bar drops its detail. The user chose option C of decision 199 on 11 November 2026, so the actions of the bar have keys, and each tooltip teaches its key, as the protocol asks for every control. A phone shows no key hint.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...checksWorkspace, conversation: 'interrupted', banner: 'none' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
