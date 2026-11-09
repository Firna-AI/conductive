import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const maskedPaths = defineScreen({
  title: 'Secret values in file paths',
  description:
    'Two paths of the branch hold the value of an org env var that an admin marked as secret: the file name scripts/seed-[redacted].sql and the folder tests/fixtures/[redacted]. Each list, tab, and page shows "[redacted]" in place of the value. The diff of the seed script is open: its tab, its header, and its row in Changes hide the value.',
  rationale:
    'The user chose A of decision 145 on 8 November 2026: the app keeps the real path for every operation, so each file still opens, and two paths that differ only in the value stay apart. Only the labels that a screen shows hide the value. The address of a tab and the name of a download keep the real path, as the access protocol says.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    paths: 'masked',
    files: 'changes',
    focus: 'files',
    tab: 'diff',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'changes',
      title: 'Changes',
      description:
        'Changes lists both files with "[redacted]" in place of the value, once in a file name and once in a folder name. The summary counts them as usual. A phone shows the list in the Files tab.',
      rationale:
        'A row still opens the diff of its real file. The label only changes the text of the row.',
      props: { tab: 'session' },
    },
    {
      slug: 'all-files',
      title: 'All files',
      description:
        'All files shows the folder [redacted] under tests/fixtures, and the file seed-[redacted].sql under scripts. Each row keeps its icon and its change mark.',
      rationale:
        'The tree keeps the order and the folders of the real paths, so two folders that differ only in the value stay two rows.',
      props: { files: 'all', tab: 'session' },
    },
    {
      slug: 'chat',
      title: 'Files of a finished turn',
      description:
        'The finished turn lists the files that it changed. The chip of seed-[redacted].sql hides the value, and it still opens the diff of the file.',
      rationale:
        'The chips use the same labels as Changes, so a value is hidden in each place that names the file.',
      props: { tab: 'session', focus: 'chat' },
    },
    {
      slug: 'unnamed',
      title: 'Name not known',
      description:
        'A file tab whose name the app does not know shows "File" in its tab and its header. Here the file moved after its tab opened, so the page says "This file moved or was deleted", and the header has no Download.',
      rationale:
        'The app knows a name from All files, Changes, or the file that it read. A tab of a file that is in none of them shows "File", because the browser cannot hide a value in a real path itself.',
      props: { files: 'all', tab: 'unnamed-file' },
    },
  ],
})
