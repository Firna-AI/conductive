import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const lostData = defineScreen({
  title: 'Output left out',
  description:
    'A second turn ran the whole test suite, which printed more output than the runner keeps. The folded tool calls say "1.2 MB of output left out", so the turn shows that it lacks output before anyone opens it.',
  rationale:
    'Decision 76 keeps at most 64 KB of the output of each tool call and 200 files of each turn, and the chat counts the rest. The count uses the units of file sizes, and names no limit, because the user cannot change it. The runner never writes a notice into the output, so the count is the only sign.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'output-left-out',
    banner: 'checks-running',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'running',
      title: 'Output left out of one call',
      description:
        'While the turn runs, its tool calls show one by one. The test run gives its result and "1.2 MB left out" on its own line, and the open group keeps the total in its first line.',
      props: { conversation: 'output-left-out-running' },
    },
    {
      slug: 'files',
      title: 'Files left out',
      description:
        'A codemod changed 247 files. The turn lists the 200 files that the runner keeps, then "47 more files" as plain text.',
      rationale:
        'The count is text, not a link, because the chat has no action that opens Changes yet. The full list stays in Changes, which the cloud computer reports apart from the chat. The Files panel here shows the sample branch of the other screens.',
      props: { conversation: 'files-left-out', banner: 'none' },
    },
    {
      slug: 'refused',
      title: 'Lost runner events',
      description:
        'The workspace refused three events of this turn, one for each reason: an update of a tool call that was too large, part of a reply that it could not read, and a tool update that came after Stop. Each one shows as one line at its place, which names what was lost and why. It never shows the lost data. The stopped turn changed more files than the runner lists, so its line ends with "5 changed files not listed", because a stopped turn shows no file list.',
      rationale:
        'The lines use the style of "You stopped the agent": centred, muted, and with an icon. A phone wraps a line into balanced lines. A resent event shows no second line.',
      props: { conversation: 'lost-lines', banner: 'none' },
    },
    {
      slug: 'turn-end',
      title: 'Lost end of a turn',
      description:
        'The event that ends the turn could not be read. The turn still ends, so the composer is ready, but its time and files are missing, and one line says so. A failed turn whose error is lost shows "The error of this turn was lost because it could not be read" in place of the error and Try again.',
      props: { conversation: 'lost-turn-end', banner: 'checks-running' },
    },
  ],
})
