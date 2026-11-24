import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  largeBranchState,
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const fileMentionList = defineScreen({
  title: 'The list of files',
  description:
    'Cal typed `@` with no query yet. The list shows every file and folder of the branch: folders first, then files, each in the order of their names, as in Conductor. A folder at the top of the branch shows no folder after its name. The list scrolls, and it shows at most 100 rows, so a longer query narrows a large tree.',
  rationale:
    'The look and the order follow the list of Conductor, as the user asked. The row limit keeps a large tree from slowing the composer, and the query finds the rest. An entry whose name hides a secret value stays out of the list, because the message would hold its real path.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, composer: 'mention-start' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'no-match',
      title: 'Nothing matches',
      description:
        'No name and no path holds `zipcode`, so one line says Nothing matches “zipcode” in place of the rows. The text stays as Cal typed it.',
      rationale:
        'The words follow the command palette, which says the same when a search finds nothing. A space or Esc closes the list.',
      props: { composer: 'mention-none' },
    },
    {
      slug: 'loading',
      title: 'Loading',
      description:
        'The file tree of the workspace still loads, as on a phone that opens the chat before Files. One line says Loading files… in place of the rows, and the rows show as soon as the tree arrives.',
      rationale:
        'The chat loads the kept files of the workspace while it shows, so the list works on a phone without a visit to Files.',
      props: { composer: 'mention-loading' },
    },
    {
      slug: 'unavailable',
      title: 'No file list',
      description:
        'The cloud computer could not read the files, and the workspace saved no list before. One line says that the list of all files is unavailable, as All files says. With a saved list, the list shows its rows.',
      rationale:
        'The words follow All files, so the two places agree on the same state of the tree.',
      props: { composer: 'mention-unavailable', tree: 'none' },
    },
    {
      slug: 'limited',
      title: 'A file that the list leaves out',
      description:
        'The branch is large, so All files and this list leave out 18,412 files and folders, such as tsconfig.json at the root. Cal typed `@tsconfig`. One line says Nothing matches “tsconfig”, that some files are not listed, and that Cal can type the path or ask the agent. A typed path stays text in the message, and the agent reads it. The right column shows Changes of the same branch, with its notice, and the pull request bar shows its 2 failed checks, as each page of the large branch does.',
      rationale:
        'Runner file report limits: Cal chose item 3 A on 23 November 2026. The list of `@`, the chips of a message, and the chips, links, and pictures of an answer keep the one tree of All files. So a path that the tree leaves out stays text or code, with no chip. A Markdown link to such a path shows as the text that the agent typed, and it opens nothing. An image of such a path shows only its label, or nothing when the label is blank. A file that a message attaches keeps its chip. Only a direct read of the path, such as the address of a file tab, opens the file. A design call of 23 November 2026 adds the reason and the way on to the line of no match, so no one reads the file as deleted. A list with matches shows no such line, because the matches answer the query.',
      props: { composer: 'mention-omitted', ...largeBranchState },
    },
  ],
})
