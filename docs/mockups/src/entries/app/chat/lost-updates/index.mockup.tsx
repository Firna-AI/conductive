import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

/** How a tab that opens later finds the lost updates, in every option. */
const replay =
  "A new tab or a reload replays the owner's stream of workspace events from the first event, apart from the cursor of the session history, so it finds the older updates. Everything stays in memory, and nothing goes to browser storage."

/** When a notice of the header bar ends. */
const clearing =
  'A newer complete file report clears the notice of its list, and a newer title or start report clears its notice. A notice that no report can match, such as an unreadable update, stays until Dismiss. Dismiss lasts for this browser tab, also across returns to the workspace, so it lives outside the workspace state that each open of the workspace makes again.'

export const lostUpdates = defineScreen({
  title: 'Option A: under the file lists',
  description:
    'The workspace refused an update to Changes that belongs to no session. One amber row under the file lists of the Files panel names it, with its time. It shows once, beside the list that may be out of date, and on a phone only in the Files tab. Lost updates of other kinds, such as the workspace name, show here too.',
  rationale: `Owner: the Files store, whose stream of workspace events already starts at the first event. ${replay} A newer complete list of the same kind clears its row, and a newer title or start report clears its row. A row that no report can match stays, because the row has no Dismiss. Later integration: the Files store and panel, and the Files tab of a phone, with no chat code. Effort: medium.`,
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, lostUpdate: 'files', focus: 'files' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'header',
      title: 'Option B: under the header',
      description:
        'One amber bar under the workspace header names the lost update, with its time and Dismiss. It shows above every tab of the centre column, and above all five tabs of a phone.',
      rationale: `Owner: the workspace state of the app shell, whose stream of workspace events already starts at the first event. ${replay} ${clearing} Later integration: the app shell and its workspace header, with no chat code. Effort: medium. It is the most visible place, so a stale file list interrupts work on every tab.`,
      props: { lostUpdate: 'header', focus: 'chat' },
    },
    {
      slug: 'contextual',
      title: 'Option D: each update beside its data',
      description:
        'A lost file report shows as the row under the file lists, as in option A. Every other lost update, such as the workspace name that the agent wrote, shows as the bar under the header, as in option B. Here a lost update to Changes and a lost workspace name show together. A phone shows the bar on every tab, and the row in the Files tab.',
      rationale: `Owners: the Files store for file reports, and the workspace state of the app shell for the other updates. ${replay} ${clearing} Later integration: the Files store and panel, and the app shell and its header, with no chat code. Effort: medium.`,
      props: { lostUpdate: 'contextual', focus: 'files' },
    },
  ],
})
