import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  largeBranchState,
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const filesLimited = defineScreen({
  title: 'All files of a large branch',
  description:
    'The branch of Checkout address autocomplete recorded the address answers of its tests again, so it holds 68,412 files and folders. All files lists 50,000 of them. A row at the top of the list says "18,412 files and folders are not listed. Find them in the terminal, or ask the agent." The count comes from the list, and it counts each folder too. The row stays in view while the tree scrolls. The changed files and their folders stay in the list, with their marks. The other entries follow in path order, so the end of tests/fixtures and tsconfig.json at the root stay out. A link to a file that the list leaves out still opens it. The Changes tab counts the whole change of 2,243 files, and leads to the Changes of the same branch.',
  rationale:
    'Runner file report limits: Cal chose M4 = F on 20 November 2026, so a list of the branch holds at most 50,000 files and folders together and gives the number that it leaves out. On 23 November 2026 Cal chose item 1 F: the changed files that Changes lists and their folders come first, then the entries of the repository and of the context folder fill the rest, with up to 5,000 of the remaining places for the context folder. The rows show only the result of that choice, with no new label. A design call of 23 November 2026 puts the notice in a quiet row at the top of the list, because it tells how to read the whole list, and the terminal and the agent still reach each file. The notice names the count of the list, never the limit. The amber notice of a list that is not the latest one keeps its place under the lists.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    ...largeBranchState,
    files: 'all',
    focus: 'files',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'unavailable',
      title: 'Saved list of a large branch',
      description:
        'After the cloud computer resumed, it could not read the files of the branch. All files keeps the limited list that it saved, with its count. The row at the top still says that 18,412 files and folders are not listed, and the amber notice under the lists says "The latest list of all files is unavailable", with no time. The first notice counts the list that shows, and the second says that a newer list did not come, so the two do not conflict. The next complete list replaces both the rows and the count.',
      rationale:
        'Runner file report limits keep the count of a saved list while the latest list is unavailable, and a new complete list replaces it, also with a count of zero. A design call of 23 November 2026 keeps each notice in its own place: the count above the rows that it describes, and the state of the latest list under the lists, as `app/chat/unavailable-files/saved-list` draws it.',
      props: { tree: 'saved' },
    },
  ],
})
