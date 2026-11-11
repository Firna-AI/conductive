/**
 * The output of the install script of Acme in an old workspace, which a
 * member runs from the notice of a changed install script. An admin added
 * ffmpeg to the script and built the computer after the workspace started.
 * The output hides each secret value, as the start logs do.
 */

import type { SetupRun } from '../components/workspace/updateCopy'
import { error, muted, plain, type TerminalLine } from './terminal'

/** The run while it goes on: the first lines, as the new package installs. */
const runningLog: readonly TerminalLine[] = [
  plain('Reading package lists...'),
  plain('Setting up ffmpeg (7:6.1.1-3ubuntu5) ...'),
  plain('Processing triggers for libc-bin (2.39-0ubuntu8.4) ...'),
  plain('added 1184 packages, and audited 1185 packages in 38s'),
]

/** The end of a run that finished. */
const finishedLog: readonly TerminalLine[] = [
  plain('✓ Generated Prisma Client (v6.2.1) in 214ms'),
  plain('Done in 11.8s'),
  plain('bun install v1.2.19'),
  plain('Checked 642 installs across 701 packages'),
]

/**
 * The end of a run that failed: the branch of the workspace added a
 * package to its manifest without its lockfile, so a clean install stops.
 */
const failedLog: readonly TerminalLine[] = [
  error('npm error code EUSAGE'),
  error('npm error Missing: react-places-autocomplete@7.3.0 from lock file'),
  muted('The install script stopped with exit code 1.'),
]

/** The output that the notice shows in each state of a run. */
export const scriptRunLogs: Readonly<
  Record<SetupRun, readonly TerminalLine[]>
> = {
  changed: [],
  running: runningLog,
  finished: finishedLog,
  failed: failedLog,
}
