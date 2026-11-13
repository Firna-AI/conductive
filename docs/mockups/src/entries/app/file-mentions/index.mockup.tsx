import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const fileMentions = defineScreen({
  title: 'File mentions',
  description:
    'In Checkout address autocomplete, Cal types `@addr` at the end of a message. The list of the files and folders of the workspace opens above the message box, as wide as the box. Each row shows the icon, the name, and the folder of an entry. Names that start with the query come first, then names that hold it, then paths that hold it. In each group, folders come before files. The first row is highlighted, and Enter or Tab picks it. The child pages show the list without a query, its other states, the chips that a pick puts into the text, and the chips of the files that an answer names.',
  rationale:
    'The user asked on 9 November 2026 for a list like the list of Conductor. The user chose option A of decision 214: the list shows the file tree that the workspace keeps, as All files does. So it works while the cloud computer sleeps, and it shows no ignored files. Only the composer of a workspace chat has the list, because a new workspace has no file tree before its first start. The other states are child pages, so this page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, composer: 'mention-query' },
  useCasePaths: ['user-flows/mention-a-file'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
