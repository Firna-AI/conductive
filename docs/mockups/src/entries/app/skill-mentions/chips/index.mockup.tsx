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
    'Cal picked `plans` from the list and typed the rest of the message. The skill shows as a chip at the start of the text: the skill icon and the name, with a line between them. The title of the chip gives the description of the skill. A chip is one unit of the text, and Backspace removes it whole. A press on its name opens the skill in the temporary tab, as app/skill-mentions/tab shows. On a phone the chip ends with a ×, which removes it.',
  rationale:
    'The plan of the skill list chose a skill chip, as for files (skill list decision 2). The draft keeps `/` and the name, such as `/plans`, and the runner writes the form of the agent that runs the message. So the chip stays right when the model changes before Send. The chip follows Remove a chip of the composer in the protocol of file mentions. Cal chose option B of skill tab decision 1 on 24 November 2026: a press on a skill chip opens the skill tab, in the message box and in a sent message, as a press on a file chip opens its file.',
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
      slug: 'name-pointer',
      title: 'Open from the message box',
      description:
        'The pointer is over the name of the skill chip. The name is underlined, as the name of a file chip is, and a press on it opens the skill in the temporary tab. The press takes no focus, so the caret stays in the text, and the chip stays one unit of the text. On a phone a tap on the name opens the skill as a page of the Files tab, and the × at the end still removes the chip.',
      rationale:
        'Skill tab decision 1 B opens the skill from the chip in the message box too, as a press on the name of a file chip opens its file (decision 213). The icon keeps its × under the pointer (decision 215), so the name is the part that opens. The chip opens the skill of the agent of the model chosen now. When that agent has no such skill, it opens the skill of the other agent, as its title does.',
      props: { composer: 'skill-chip-name' },
    },
    {
      slug: 'sent',
      title: 'Sent',
      description:
        'Cal sent the message. It shows the skill chip at its place, without a ×. The agent ran the skill and wrote a plan. The answer of the agent keeps its text as it is. A press on the chip opens the skill in the temporary tab, as app/skill-mentions/tab shows.',
      rationale:
        'A sent message shows a chip for each `/` text that names a skill of the current list. Every other such text stays text, and text in code stays code. Cal chose option B of skill tab decision 1 on 24 November 2026: a press on the chip opens the skill tab with the text that the agent reads, for a skill of each place, also of the org skills and of the shared Codex home.',
      props: { conversation: 'skill-answer', composer: 'empty' },
      useCasePaths: flow,
    },
    {
      slug: 'sent-pointer',
      title: 'Open from a sent message',
      description:
        'The pointer is over the skill chip of the sent message. The chip takes the fill of a hover, as each chip that opens a page does, and its title gives the description of the skill. A press opens the skill in the temporary tab, as app/skill-mentions/tab shows. On a phone a tap opens the skill as a page of the Files tab.',
      rationale:
        'The chip of a sent message opens the skill of the agent of that message, so the tab shows the skill of the agent that ran the message, in its current text. When that agent has no such skill, the chip opens the skill of the other agent, as its title does.',
      props: { conversation: 'skill-answer-pointer', composer: 'empty' },
      useCasePaths: flow,
    },
  ],
})
