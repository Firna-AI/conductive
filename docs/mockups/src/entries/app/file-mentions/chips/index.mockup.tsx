import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

const flow = ['user-flows/mention-a-file']

export const fileMentionChips = defineScreen({
  title: 'File chips',
  description:
    'Cal picked a file and a folder from the list. Each shows as a chip in the text: the icon and the name, with a line between them. The title of a chip gives the whole path. A chip is one unit of the text, and Backspace removes it whole. On a phone each chip ends with a ×, which removes it.',
  rationale:
    'The user chose option B of decision 213 on 9 November 2026: a chip with only the icon and the name. The draft keeps `@` and the path inside the repository, and a folder path ends with `/`. The agent gets that same text (decision 216). Both agents start in the repository folder, and their instructions name it, so the path is exact. A phone has no pointer, so its chips show the × at the end (decision 217).',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, composer: 'file-chips' },
  useCasePaths: flow,
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'pointer',
      title: 'Remove a chip',
      description:
        'The pointer is over the icon of the file chip. A × takes the place of the icon, and a press on it removes the chip as one step of undo. A press on the name opens the file, as a press in All files does. On a phone the chips keep their icons and show the × at the end.',
      rationale:
        'The user asked on 9 November 2026 that each chip of the composer swap its icon for a × under the pointer (decision 215). In the text a keyboard removes a chip with Backspace, so the × takes no keyboard focus there.',
      props: { composer: 'file-chip-pointer' },
    },
    {
      slug: 'sent',
      title: 'Sent',
      description:
        'Cal sent the message. It shows the file chip and the folder chip. A press on the file chip opens the file in a tab, and a press on the folder chip shows All files with the folder open. The answer of the agent keeps its paths as text.',
      rationale:
        'The agent gets the text of the message as Cal wrote it, with `@` and each path inside the repository (decision 216). Chips show only in the messages of members, because only the composer writes mentions.',
      props: { conversation: 'mention-answer', composer: 'empty' },
      useCasePaths: flow,
    },
    {
      slug: 'workspace-chip',
      title: 'Remove a workspace chip',
      description:
        'A pasted workspace link follows the same rule in the message box. Under the pointer, a × takes the place of the state mark, and a press removes the chip. A chip in a sent message has no ×.',
      rationale:
        'Decision 215 covers every chip of the composer. The state mark stays at rest and on a phone, so the chip still shows the state of the workspace (decision 211).',
      props: { composer: 'workspace-link-pointer' },
    },
    {
      slug: 'attached-file',
      title: 'Remove an attached file',
      description:
        'An attached file is a chip in the text too, and it follows the same rule. Under the pointer, a × takes the place of the icon of the screenshot, and a press removes the chip as one step of undo. Backspace and Delete remove the chip whole, as for a file chip. The removal takes the file off the message and stops its upload, and undo brings back the chip with its file. On a phone each attached file keeps its icon and shows the × at the end.',
      rationale:
        'Decision 215 covers the attached files too. The user chose option A of decision 263 on 10 November 2026, so each attached file is a chip in the text and the row above the text is gone. Backspace now reaches each attached file, so the × takes no keyboard focus, as for the other chips of the text. The draft never sends a file that its text does not show.',
      props: { composer: 'attachment-pointer' },
    },
  ],
})
