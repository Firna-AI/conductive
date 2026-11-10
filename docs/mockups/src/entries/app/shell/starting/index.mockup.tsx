import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const sandboxStarting = defineScreen({
  title: 'Sandbox starting',
  description:
    'Opening a stopped workspace resumes its sandbox. The chat history shows at once, with the steps of the resume at its end, and the files and tools wait until the sandbox is ready. Under the steps, a note says that each start has a 20-minute limit.',
  rationale:
    'The user chose option C of decision 128 on 8 November 2026: each whole create and resume has a 20-minute limit from its start, and the app tells the user of the limit. The note keeps the limit out of the title of the card.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, sandbox: 'starting' },
  useCasePaths: [
    'user-flows/reopen-stopped-workspace',
    'user-flows/open-workspace-from-palette',
  ],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'diff',
      title: 'Diff tab while starting',
      description:
        'A diff tab that shows during the resume waits for the sandbox too, in place of its diff. Its header keeps the name of the file and the lines that it changes, from the saved list of changes. On a phone the tab is a page of the Files tab. The diff opens when the sandbox is ready.',
      rationale:
        'The files and the tools wait until the sandbox is ready. A read during the start fails, so a page that reads then shows an error and Try again for a problem that the start ends by itself.',
      props: { focus: 'files', tab: 'diff' },
    },
  ],
})
