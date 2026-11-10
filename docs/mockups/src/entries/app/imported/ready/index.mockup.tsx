import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  importedWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const importedReady = defineScreen({
  title: 'Activated',
  description:
    'The activation is done, and the workspace is ready. It is a workspace like the others: the header keeps the flag From Conductor, the right column shows the files of the branch with the work from Conductor, and the terminal and the previews work. The old sessions stay links in place of the empty chat, and the composer starts the first new session, whose tab says Untitled until its first message.',
  rationale:
    'This screen shows no tab of a resumed old session. How the agent of an activated workspace continues its old work is still open, so the mockups draw only a new session.',
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
        'The Terminal tab of a phone after the activation, in the cloud computer of the workspace.',
      props: { focus: 'tool', tool: 'terminal' },
    },
    {
      slug: 'preview',
      title: 'Preview',
      description:
        'The Preview tab of a phone after the activation. No session has started a web server yet, so no port is open.',
      props: { focus: 'tool', tool: 'preview', ports: 'none' },
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
