import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const skillMentions = defineScreen({
  title: 'Skill mentions',
  description:
    'In Checkout address autocomplete, Cal types `/pl` at the start of a message. The list of the skills that the agent can use opens above the message box, as wide as the box, where the list of files opens. Each row shows the skill icon, the name, and the description of a skill on one line. The description is muted, and the end of the row cuts it with an ellipsis. Names that start with the query come first, then names that hold it, then descriptions that hold it. The first row is highlighted, and Enter or Tab picks it. The child pages show the list without a query, its other states, and the chip that a pick puts into the text.',
  rationale:
    'The plan of the skill list chose a list like the list of files, with the same place, rows, and keys. The description tells the member what each skill does, so a member can pick a skill without its name in mind. The runner reports the skills of the cloud computer, and the workspace keeps the latest list, so the list works while the cloud computer sleeps. `/` opens the list only at the start of the text or after a space or a line break, so a path such as `src/a` opens nothing. The other states are child pages, so this page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, composer: 'skill-query' },
  useCasePaths: ['user-flows/use-a-skill'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
