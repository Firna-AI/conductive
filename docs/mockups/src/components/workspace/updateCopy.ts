/**
 * The words of the app's own software in a cloud computer, and of the
 * updates of an old workspace. The app's own software is the agent runner,
 * the terminal, the port previews, and the helpers of git and GitHub. One
 * name covers it in the build log and in the start steps, so that members
 * tell it apart from the install script of their org. The Worker writes the
 * same words. This module imports no fixture, so that the app can share it.
 */

/** The one name of the app's own software, inside a sentence. */
const ownSoftware = 'the agent and terminal software'

/** The name at the start of a sentence. */
const ownSoftwareFirst =
  ownSoftware.charAt(0).toUpperCase() + ownSoftware.slice(1)

/** The step of a build without a ready software image that installs it. */
export const installingSoftware = `Installing ${ownSoftware}`

/** The start step that updates it in a workspace with an earlier version. */
export const updatingSoftware = `Updating ${ownSoftware}`

/**
 * The warning after an update that failed at a start. The start went on,
 * so the workspace runs the earlier version until its next start tries
 * the update again.
 */
export const softwareNotUpdated = `${ownSoftwareFirst} didn't update. This workspace keeps the earlier version until its next start.`

/**
 * The install script of the org image that a workspace started from: the
 * current one, or one that an admin changed and built since. A changed
 * script shows a notice, whose action runs the current script in the
 * workspace: it runs, it finished, or it failed.
 */
export const setupStates = [
  'current',
  'changed',
  'running',
  'finished',
  'failed',
] as const

type SetupState = (typeof setupStates)[number]

/** A state of the notice: each state but a current install script. */
export type SetupRun = Exclude<SetupState, 'current'>

/** The title and the body of the notice in each state. */
export const setupText: Readonly<
  Record<SetupRun, { title: string; body?: string }>
> = {
  changed: {
    title: 'The install script changed',
    body: 'New workspaces start with the new setup. Run the script here to get it in this workspace.',
  },
  running: { title: 'Running the install script' },
  finished: {
    title: 'The install script finished',
    body: 'This workspace has the new setup.',
  },
  failed: {
    title: 'The install script failed',
    body: 'Check the output and try again.',
  },
}

/** The action of the notice before a run. */
export const runScriptLabel = 'Run install script'
