import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  checksWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const gitHubBanner = defineScreen({
  title: 'GitHub banner',
  description:
    'The branch has commits but no pull request yet: the agent was stopped before it opened one. The pull request bar shows the branch and its target, with a link that creates the pull request on GitHub. The Checks tab waits for a pull request. The child pages show the other states of decision 18.',
  rationale:
    'The pull request bar sits at the top of the right column, above the Checks tab, which lists each check that GitHub reports. On a phone a compact row at the top of the workspace opens the checks. Status uses an icon and words, never only a colour, and a state tints the whole bar, never one edge. Each action of the bar links to GitHub, because the app merges nothing and writes nothing to GitHub for the bar.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...checksWorkspace, conversation: 'interrupted', banner: 'none' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
