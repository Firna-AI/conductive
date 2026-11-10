import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  importedWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const importedActivating = defineScreen({
  title: 'Activating',
  description:
    'Cal chose Activate. The first sandbox of the workspace starts from the newest good build of Acme, fetches calummoore/karachi-v7 from GitHub, copies in the work from Conductor that GitHub does not hold, and restores the memory of each session from Conductor. The chat shows each step, with the time and the limit of a start. The composer is back for the first message, which waits until the sandbox is ready, as in every first start. The files and the tools wait for the sandbox.',
  rationale:
    'The user chose on 9 November 2026 that activation starts the cloud computer and then copies the stored work in, and on 10 November 2026 that it restores the memory of each session. Before it sends the work, it checks that the work fits the free disk. Activation is the first start of the workspace, so it shows the steps of a start, and Send queues each message, as during every start. A message starts the first new session of the workspace.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...importedWorkspace, sandbox: 'starting', tab: 'new-session' },
  useCasePaths: ['user-flows/import-from-conductor'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
