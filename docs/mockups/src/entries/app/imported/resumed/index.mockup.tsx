import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  importedWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

const flow = ['user-flows/import-from-conductor']

export const importedResumed = defineScreen({
  title: 'Resumed session',
  description:
    'After the activation, Cal opened the tab of Apply coupons before tax, a session from Conductor, and asked for one more change. It is an ordinary session tab. Its first line says that it continues Apply coupons before tax from Conductor, and the title opens the old document. Below it the chat shows only the new turn: the agent changed the receipt and named the change that the old chat made, because it continues with its memory. On a phone the session tabs sit above the chat. The child states show the old document opened from this tab and a session that could not resume.',
  rationale:
    'The user chose on 10 November 2026 that activation restores the memory file and the identity of each session, so the old session continues with its memory. The old turns stay in the document, so the chat loads no old event. Claude keeps the model of the old session, and Cal, who imported the workspace, is its starter.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...importedWorkspace,
    sandbox: 'ready',
    tab: 'session',
    resume: 'memory',
  },
  useCasePaths: flow,
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'document',
      title: 'Its old document',
      description:
        'The first line of the resumed session opened Apply coupons before tax in the Markdown view, in a tab at the end of the row. The tab of the session stays in the row, and opens the session again. On a phone the document opens in the Chat tab, and its way back returns to the resumed session, not to the new session.',
      rationale:
        'The document of a session stays readable for the life of the workspace, before and after the activation and while the cloud computer is stopped. A link from a session keeps that session, so a reader never loses the chat that they came from.',
      props: { tab: 'old-session' },
      useCasePaths: flow,
    },
    {
      slug: 'fallback',
      title: 'Could not resume',
      description:
        'Coupon edge cases in tests ran on Codex, and its memory file came along, but it could not resume. So its tab holds a fresh session, and its first line says so. Its first message names its old chat in .context/conductor/, and the agent reads that file before it works. The composer keeps the Codex model of the old session. The old document of this session is not drawn, so its title stays plain text.',
      rationale:
        'The user chose on 10 November 2026 that the Markdown file of a session is the fallback for a session that does not resume, and that the first message of its new session names that file. This is not a session whose memory file was gone on the Mac: such a session did not import, and the result of the import names it.',
      props: { resume: 'fallback' },
    },
  ],
})
