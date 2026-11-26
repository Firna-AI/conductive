import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

const flow = ['user-flows/use-a-skill']

export const skillMentionChips = defineScreen({
  title: 'Skill chips',
  description:
    'Cal picked `plans` from the list and typed the rest of the message. The skill shows as a chip at the start of the text: the skill icon and the name, with a line between them. The title of the chip gives the description of the skill. A chip is one unit of the text, and Backspace removes it whole. On a phone the chip ends with a ×, which removes it.',
  rationale:
    'The plan of the skill list chose a skill chip, as for files (skill list decision 2). The draft keeps `/` and the name, such as `/plans`, and the runner writes the form of the agent that runs the message. So the chip stays right when the model changes before Send. The chip follows Remove a chip of the composer in the protocol of file mentions.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, composer: 'skill-chip' },
  useCasePaths: flow,
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'pointer',
      title: 'Remove a skill chip',
      description:
        'The pointer is over the icon of the skill chip. A × takes the place of the icon, and a press on it removes the chip as one step of undo. On a phone the chip keeps its icon and shows the × at the end.',
      rationale:
        'Each chip of the composer swaps its icon for a × under the pointer (decision 215). In the text a keyboard removes a chip with Backspace, so the × takes no keyboard focus.',
      props: { composer: 'skill-chip-pointer' },
    },
    {
      slug: 'sent',
      title: 'Sent',
      description:
        'Cal sent the message. It shows the skill chip at its place, without a ×. The agent ran the skill and wrote a plan. The answer of the agent keeps its text as it is.',
      rationale:
        'A sent message shows a chip for each `/` text that names a skill of the current list. Every other such text stays text, and text in code stays code. A press on the chip opens nothing, because the skill is not a file of the branch.',
      props: { conversation: 'skill-answer', composer: 'empty' },
      useCasePaths: flow,
    },
  ],
})
