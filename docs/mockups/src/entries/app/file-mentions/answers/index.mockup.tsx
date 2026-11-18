import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const fileMentionAnswers = defineScreen({
  title: 'File chips in answers',
  description:
    'The agent answers with the files that it changed and used, and with a screenshot of the result. Each file of the workspace that the answer names shows as a file chip, the same chip as in the messages of members. The bold mention `**@src/app/checkout/AddressForm.tsx**` shows as a bold chip. The absolute path of the screenshot in code shows as the chip after.png, because it starts with the repository folder. The path with the lines `:19-22` shows as the chip useAddressAutocomplete.ts:19-22. A press on that chip opens the file at those lines. The Markdown image of the screenshot shows as a small picture at its place in the line, and the words of the line keep to its top edge. The picture keeps its proportions and fits the width of the answer, up to a height of 240 px. Its alternative text is the label, Postcode field on a phone, and its title is the path. A press on the picture opens the screenshot in the file tab, as a press on the chip after.png does. The path in the billing service stays code, because it is in another repository. The command in the code block stays code too, also its path. The child pages show the picture while it loads, the link while the cloud computer is stopped, and the pictures in the work of a turn.',
  rationale:
    'The user chose answer chip decisions 1 and 2 on 13 November 2026. Decision 1 is A and C together: the chat reads `@` mentions and paths in inline code in answers, and the instructions ask the agents to write `@` mentions. The whole code must be the path of an entry of the file tree, relative or under the repository folder, with an optional line target. A code block, a path in another repository, and one word without a `/` or a `.` stay code. All files lists only the workspace repository, so a chip could open nothing else. Decision 2 is C: a chip with a line target shows the lines in its name, and opens the file tab with the lines in view and marked. The user asked on 13 November 2026 that a Markdown link to a file stays a normal link with its label, and opens the file (answer chip decision 4). The user chose B of screenshot decision 2 on 18 November 2026: the agent picks the images that show its work. So a Markdown image of a PNG, JPEG, GIF, or WebP file of the workspace shows as a small picture, and a press on it opens the file tab. This replaces the part of decision 4 that showed an image as a link. A Markdown link without `!` stays a link, and an SVG file stays a link, as in the file tab. The height limit keeps the answer short to read, and the file tab shows the full size. A picture in the line keeps the order of the sentence, and two screenshots of a phone can stand side by side. The words keep to the top of the picture, as beside a chip, so the sentence reads on from the line above it. A heading and a table cell show the image as a link, because a picture breaks the layout of the heading or of the row. The other states are child pages, so this page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, conversation: 'file-answer' },
  useCasePaths: ['user-flows/open-a-file-from-an-answer'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
