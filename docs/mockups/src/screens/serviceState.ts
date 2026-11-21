/**
 * The parts of the workspace state that draw the services of the Preview
 * tool. `workspaceState.ts` adds them to the state of the screen.
 */
export const serviceStateProperties = {
  /**
   * The services of the report, above the servers of the Preview tool.
   * `unsupported` is software of the cloud computer without services, which
   * shows the tool as before. `empty` is a report with no service.
   * `load-failed` is a first read of the list that failed: a notice with
   * Try again takes the place of the rows. No port leaves Servers for a service.
   * The other lists hold `storybook`, `web`, and `worker`: as they run, with
   * ended and failed runs, after the memory failure of `storybook`, while
   * a Stop or a Restart of `web` runs, and after it. `ports` holds `dev`,
   * one service with nine ports, and `worker`. `read-only` is the list of
   * a viewer without the right to restart the software, whose rows have no
   * Stop and no Restart.
   */
  services: {
    enum: [
      'unsupported',
      'empty',
      'load-failed',
      'running',
      'ended',
      'memory',
      'ports',
      'stopping',
      'stopped',
      'restarting',
      'restarted',
      'read-only',
    ],
  },
  /**
   * What lies open over the services, or the result of a control: the
   * menu of `web`, the question before its Stop, a log, or a toast. The
   * log is of `web`, while it loads, after a failed read, of `worker`,
   * which has printed nothing, or of `storybook` after its memory failure.
   * The toasts: a failed Stop, a Stop whose reply was lost, and a Stop for
   * a run that ended before the Stop arrived.
   */
  serviceView: {
    enum: [
      'none',
      'menu',
      'stop',
      'log',
      'log-loading',
      'log-failed',
      'log-empty',
      'log-memory',
      'stop-failed',
      'unconfirmed',
      'stale',
    ],
  },
} as const

export const serviceStateKeys = ['services', 'serviceView'] as const

type ServicesShown = (typeof serviceStateProperties.services.enum)[number]

/**
 * Whether the rows offer Restart and Stop: under the rule of Restart in the
 * header, which also leaves the header state as plain text. The list and
 * the logs follow the right to read the workspace.
 */
export function serviceControls(state: { services: ServicesShown }): boolean {
  return state.services !== 'read-only'
}

/** No services in the report, as before, and nothing open over them. */
export const serviceStateDefaults = {
  services: 'unsupported',
  serviceView: 'none',
} as const
