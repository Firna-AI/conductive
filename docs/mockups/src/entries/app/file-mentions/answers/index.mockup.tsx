import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const fileMentionAnswers = defineScreen({
  title: 'File chips in answers',
  description:
    'The agent answers with the files that it changed and used. Each file of the workspace that the answer names shows as a file chip, the same chip as in the messages of members. The mention `@src/app/checkout/AddressForm.tsx` shows as a chip. The absolute path of the screenshot in code shows as the chip after.png, because it starts with the repository folder. The path with the lines `:19-22` shows as the chip useAddressAutocomplete.ts:19-22. A press on that chip opens the file at those lines. The path in the billing service stays code, because it is in another repository. The command in the code block stays code too, also its path.',
  rationale:
    'The user chose answer chip decisions 1 and 2 on 13 November 2026. Decision 1 is A and C together: the chat reads `@` mentions and paths in inline code in answers, and the instructions ask the agents to write `@` mentions. The whole code must be the path of an entry of the file tree, relative or under the repository folder, with an optional line target. A code block, a path in another repository, and one word without a `/` or a `.` stay code. All files lists only the workspace repository, so a chip could open nothing else. Decision 2 is C: a chip with a line target shows the lines in its name, and opens the file tab with the lines in view and marked.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, conversation: 'file-answer' },
  useCasePaths: ['user-flows/open-a-file-from-an-answer'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
