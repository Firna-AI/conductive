import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  largeBranchState,
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const filesChangesLimited = defineScreen({
  title: 'Changes of a large branch',
  description:
    'The branch of Checkout address autocomplete changes 2,243 files, because it recorded the address answers of its tests again. Changes lists 1,000 of them. The summary and the Changes tab give the whole change: 2,243 files changed, with the lines that all of them add and remove. Under the summary, a row says "The totals include 1,243 files that are not listed. Review them in the terminal, or ask the agent." The rows keep the order of Changes, by path. The edits of the agent show first here only because their paths come first. A press on a row still opens its diff.',
  rationale:
    'Runner file report limits: Cal chose M4 = F on 20 November 2026, so Changes lists at most 1,000 files and gives the number of the other files and the lines that they add and remove. The summary and the tab count the whole change. On 23 November 2026 Cal chose item 2 B: the list keeps the uncommitted changes first, then the committed changes, each in path order. The rows show only the result of that choice, with no group and no label. A design call of 23 November 2026 puts the notice right under the summary, so it explains the totals that are larger than the rows, and the notice stays in view while the rows scroll. It names the count of the list, never the limit.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    ...largeBranchState,
    files: 'changes',
    focus: 'files',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'repair-failed',
      title: 'After a failed repair',
      description:
        'An update of Changes was lost, and the fresh full list that the workspace asked for was lost too. Changes keeps the limited list that it saved, with its totals and its notice at the top. The amber notice under the lists says "The latest list of changes is unavailable", with the time since the failure. The totals and the count belong to the list that shows, so the two notices do not conflict.',
      rationale:
        'Runner file report limits keep the totals of a saved list while the latest list is unavailable, and the next complete list replaces them. The notice of the failed repair keeps its words and its place from decision 96, as `app/chat/lost-updates` draws it. Only the notice of Changes shows here.',
      props: { lostUpdate: 'changes-repair' },
    },
  ],
})
