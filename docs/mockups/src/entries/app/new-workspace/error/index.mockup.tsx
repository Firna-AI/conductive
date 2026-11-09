import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

const flow = ['user-flows/retry-first-start']

export const startFailed = defineScreen({
  title: 'First start failed',
  description:
    'The first start of the new workspace failed, and Lisbon stays in General for every member of the org. The bar shows the message that the app saved for the start, and Try again starts a new sandbox. The two messages wait in the queue, and the composer under the bar takes more. The files and the tools show the error, because the workspace has no files yet.',
  rationale:
    'The user chose option D of decision 130 on 8 November 2026. The workspace keeps its chat and its queue, so no message goes back to a composer, and no member loses access. Try again starts a new cloud computer in the same workspace, with a new workspace token, and the app cleans up the failed one. Only a failed first start keeps the composer. A failed resume shows its bar in place of the composer, as app/shell/error shows. The form of a failed create request is now app/new-workspace/not-created.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    workspace: 'saved-carts',
    sandbox: 'error',
    conversation: 'queued-follow-up',
    banner: 'no-commits',
  },
  useCasePaths: flow,
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'member',
      title: 'Another member',
      description:
        'Priya, a member who is not the owner, opens Lisbon from her list. She sees the same error, the queue, and Try again. She writes a message, and Send is on. Her message uses the login of Cal, who started the session.',
      rationale:
        'The failed workspace stays for every member of the org (decision 130). Only the owner and the admins archive a workspace (decision 42), so Priya sees no Archive.',
      props: { viewer: 'member', composer: 'draft' },
      useCasePaths: flow,
    },
    {
      slug: 'files',
      title: 'Files on a phone',
      description:
        "The Files tab of a phone after the failed first start. The panel says that the sandbox couldn't start and that the chat is saved, with Try again. The Terminal, Preview, and Desktop tabs show the same panel.",
      rationale:
        'A phone shows the bar of the chat only on the Chat tab, so each panel of a phone shows the action too. The new workspace has no saved lists, so the panel takes the place of All files and Changes.',
      props: { focus: 'files' },
    },
  ],
})
