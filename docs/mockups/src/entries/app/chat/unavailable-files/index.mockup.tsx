import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const unavailableFiles = defineScreen({
  title: 'Changed files unavailable',
  description:
    'The cloud computer could not read the files that the turn changed. The turn still finished, so it ends with its duration, and "Changed files unavailable" takes the place of its files. The composer is ready, and Changes still lists the changes of the branch.',
  rationale:
    'The user chose D of decision 109 on 7 November 2026: a failed read of the files ends its step, and a mark tells data that the cloud computer could not read from empty data. So the turn shows as finished, not as failed, and the words never say that it changed no files. A late end of a stopped turn shows the same words in its row. The text has the muted style and the icon of the other unavailable data.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'files-unavailable',
    banner: 'checks-running',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'stopped',
      title: 'Stopped turn',
      description:
        'The user pressed Stop, and the cloud computer could not read the files that the turn changed. A stopped turn shows no file list, so its line ends with the words: "You stopped the agent · Changed files unavailable".',
      rationale:
        'The words take the place of the count of files that the runner did not list, such as "5 changed files not listed".',
      props: { conversation: 'stopped-files-unavailable', banner: 'none' },
    },
    {
      slug: 'saved-list',
      title: 'Saved list of all files',
      description:
        'After the cloud computer resumed, it could not read the files of the branch. All files keeps the list that it saved before, and the notice under the lists says "The latest list of all files is unavailable". The next complete list replaces it, and the notice goes. A phone shows the notice in the Files tab.',
      rationale:
        'The notice has the words and the place of the notice of a failed repair, because the user sees the same thing in both cases: a saved list that can be out of date. It names the data, not the cause. It shows no time, because the mark carries none. The saved list keeps its marks of changed files.',
      props: {
        conversation: 'history',
        files: 'all',
        focus: 'files',
        tree: 'saved',
      },
    },
    {
      slug: 'no-list',
      title: 'No list of all files',
      description:
        'The cloud computer of a new workspace could not read its files, and no list was saved before. All files says "The list of all files is unavailable" in place of the tree, so the branch does not look empty. The agent still works on the first message.',
      rationale:
        'A failed read of the files does not hold up the start, so the chat leaves its starting state and the agent can work. The state has the quiet style of the other panel states. It offers no action, because the cloud computer sends the complete list after its next successful read.',
      props: {
        workspace: 'saved-carts',
        conversation: 'first-turn',
        banner: 'no-commits',
        files: 'all',
        focus: 'files',
        tree: 'none',
      },
    },
  ],
})
