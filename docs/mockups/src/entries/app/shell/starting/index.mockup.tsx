import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const sandboxStarting = defineScreen({
  title: 'Sandbox starting',
  description:
    'Opening a stopped workspace resumes its sandbox. The chat history shows at once, with the steps of the resume at its end. All files and Changes show the lists that the workspace saved, and the tools wait until the sandbox is ready. A file or a change that a member opens waits for the sandbox.',
  rationale:
    'The user chose option C of decision 128 on 8 November 2026: each whole create and resume has a 20-minute limit from its start. On 10 November 2026 the user asked to remove the note of that limit from the chat. So the card shows only the steps and the time since the start. A start that passes the limit names it in its error, as app/shell/error/time-limit shows. On 13 November 2026 the user asked for the saved lists while a sandbox resumes, because the workspace already keeps them and a stopped sandbox does not change its files. A new workspace has no saved lists, so the wait of its first start takes their place, as app/new-workspace/creating shows.',
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
        'A diff that a member opens while the sandbox is stopped resumes the sandbox, as the open of the workspace does. The diff opens in the temporary tab, which then waits for the sandbox in place of its diff. Its header keeps the name of the file and the lines that it changes, from the saved list of changes. On a phone the tab is a page of the Files tab. The diff shows when the sandbox is ready.',
      rationale:
        'The user chose on 10 November 2026 that opening a file or a change starts the sandbox (decision 247). The tools wait until the sandbox is ready, and so does a file or a change that a member opens. The lists keep their saved copy. A read during the start fails, so a page that reads then shows an error and Try again for a problem that the start ends by itself. A press opens the diff in the temporary tab, from option B of decision 284, which the user chose on 11 November 2026.',
      props: { focus: 'files', tab: 'diff', temporary: 'opened' },
    },
  ],
})
