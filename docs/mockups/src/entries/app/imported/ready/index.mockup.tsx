import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  importedWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const importedReady = defineScreen({
  title: 'Activated',
  description:
    'The activation is done, and the workspace is ready. It is a workspace like the others: the header keeps the flag From Conductor, the right column shows the files of the branch with the work from Conductor, and the terminal and the previews work. Each session from Conductor now has its own session tab, oldest first, and continues with the memory of its agent. The tab of Apply coupons before tax opens that session, and the tab of Coupon edge cases in tests opens a session that could not resume. The new session that the activation opened comes last. Its tab says Untitled until its first message, and its empty chat keeps the links to the old documents.',
  rationale:
    'The user chose on 10 November 2026 that activation restores the memory file and the identity of each session, so each old session continues as an ordinary session tab that links back to its old document. The mockups draw no outcome for Explain the basket totals, so its tab stays static.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...importedWorkspace, sandbox: 'ready', tab: 'new-session' },
  useCasePaths: ['user-flows/import-from-conductor'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'files',
      title: 'Files',
      description:
        'The Files tab of a phone after the activation. All files lists the files of the branch with the work from Conductor, and the tabs at the bottom stay in this workspace and this state.',
      props: { focus: 'files' },
    },
    {
      slug: 'terminal',
      title: 'Terminal',
      description:
        'The Terminal tab of a phone after the activation, in the cloud computer of the workspace. It waits at a prompt on storefront and calummoore/karachi-v7, because no session runs a process yet.',
      props: { focus: 'tool', tool: 'terminal' },
    },
    {
      slug: 'preview',
      title: 'Preview',
      description:
        'The Preview tab of a phone after the activation. No session has started a web server yet, so no port is open.',
      props: { focus: 'tool', tool: 'preview' },
    },
    {
      slug: 'stopped',
      title: 'Stopped',
      description:
        'Later, the cloud computer of the activated workspace stopped. The bar of a stopped sandbox, with Resume, takes the place of the composer, as in any workspace. The old sessions stay links, and each one opens its file while the workspace is stopped.',
      props: { sandbox: 'stopped' },
    },
  ],
})
