import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const skillTabSource = defineScreen({
  title: 'Source',
  description:
    'The switch shows Source. The whole SKILL.md of plans shows with line numbers: the front matter with the name and the description, then the Markdown body. The text has no syntax colours, as the source of a Markdown file has none. The header gives the line count before the switch. On a phone the line count hides, as on the page of a file.',
  rationale:
    'The Preview draws no front matter, so Source is the place where the member sees the whole text that the agent reads, also settings such as the tools that the skill allows. The switch keeps the state of the tab, temporary or kept, as for a Markdown file.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'skill-answer',
    focus: 'files',
    tab: 'skill-source',
    temporary: 'opened',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
