/**
 * The words of the services of the Preview tool: the list, the menu of a
 * row, the question before Stop, the results of a control, and the log.
 * A service is a named server that runs outside every agent turn, until
 * the cloud computer stops. This module imports no fixture, so the app can
 * use it too. It also gives the shapes that the words read, until the
 * runner contract of services gives them.
 */

import { nameLabel } from '../../../../../src/shared/name-label'

/** How the last run of a service ended, as the report gives it. */
type ServiceResult =
  /** Its process exited with this code. */
  | { kind: 'exit'; code: number }
  /** A signal ended its process, such as `SIGSEGV`. */
  | { kind: 'signal'; signal: string }
  /** The cloud computer ran out of memory, so the service was stopped. */
  | { kind: 'memory' }
  /** Its command did not start, such as a program that is not installed. */
  | { kind: 'start' }

/**
 * The state of a service: its actual state from the latest report, or a
 * Stop or a Restart that runs. `started` and `at` are the times that the
 * row shows, such as `12m ago`.
 */
export type ServicePhase =
  | { kind: 'running'; started: string }
  | { kind: 'stopping' }
  | { kind: 'restarting' }
  | { kind: 'stopped'; at: string }
  | { kind: 'ended'; result: ServiceResult; at: string }
  | { kind: 'failed'; result: ServiceResult; at: string }

/**
 * Where a service started: a session that the workspace matched to the
 * call, or a command on the cloud computer that it did not match, such as
 * one in a terminal. It is context, not the name of a person, and it gives
 * no rights.
 */
export type ServiceSource =
  { kind: 'session'; title: string | null } | { kind: 'local' }

/**
 * A service as the Preview tool lists it: its exact name, the filtered
 * label of its program and its folder, each null when the report has none,
 * its state, the ports that it listens on, and where it started.
 */
export type ServiceEntry = {
  name: string
  label: string | null
  folder: string | null
  phase: ServicePhase
  ports: readonly number[]
  source: ServiceSource
}

/** The words of the list, the menu, the question, and the results. */
export const servicesCopy = {
  heading: 'Services',
  listLabel: 'Services in this sandbox',
  serversHeading: 'Servers',
  empty:
    'Ask the agent to start a server as a service, which runs until the cloud computer stops.',
  noPort: 'No port',
  local: 'Local command',
  /** The hidden words before the title of the session that started it. */
  sessionSource: 'Started in the session',
  restart: 'Restart',
  stop: 'Stop',
  cancel: 'Cancel',
  stopBody: 'It ends for everyone in this workspace. Restart runs it again.',
  memory: 'Out of memory',
  notStarted: "Couldn't start",
  latestState: 'The list shows its latest state.',
} as const

/** The word of each state, as the row and the log show it. */
export const serviceStateLabels: Readonly<
  Record<ServicePhase['kind'], string>
> = {
  running: 'Running',
  stopping: 'Stopping…',
  restarting: 'Restarting…',
  stopped: 'Stopped',
  ended: 'Ended',
  failed: 'Failed',
}

/** The result of a run, such as `Exit code 1` or `Out of memory`. */
function serviceResultText(result: ServiceResult): string {
  switch (result.kind) {
    case 'exit':
      return `Exit code ${result.code}`
    case 'signal':
      return `Signal ${result.signal}`
    case 'memory':
      return servicesCopy.memory
    case 'start':
      return servicesCopy.notStarted
  }
}

/**
 * The words after the state: the start of a run, or the result and the
 * time of its end. A control that runs shows none.
 */
export function servicePhaseDetail(phase: ServicePhase): string | null {
  switch (phase.kind) {
    case 'running':
      return `Started ${phase.started}`
    case 'stopping':
    case 'restarting':
      return null
    case 'stopped':
      return phase.at
    case 'ended':
    case 'failed':
      return `${serviceResultText(phase.result)} · ${phase.at}`
  }
}

/** The words of the start source: the session title, or Local command. */
export function serviceSourceText(source: ServiceSource): string {
  return source.kind === 'session'
    ? nameLabel(source.title)
    : servicesCopy.local
}

/** The tooltip of the start source, such as `Started in the session Address autocomplete`. */
export function serviceSourceLabel(source: ServiceSource): string {
  return source.kind === 'session'
    ? `${servicesCopy.sessionSource} ${nameLabel(source.title)}`
    : servicesCopy.local
}

/**
 * The tooltip and the spoken name of a service: its name, its label, and
 * its folder, such as `storybook, storybook dev in packages/ui`.
 */
export function serviceDescription(service: ServiceEntry): string {
  const label = service.label === null ? '' : `, ${service.label}`
  const folder = service.folder === null ? '' : ` in ${service.folder}`
  return `${service.name}${label}${folder}`
}

/** The words that name one service in a control. */
export const serviceControlCopy = {
  more: (name: string) => `More for ${name}`,
  showLog: (name: string) => `Show log of ${name}`,
  port: (port: number) => `Open the preview of port ${port}`,
  stopTitle: (name: string) => `Stop ${name}?`,
  stopFailed: (name: string) => `Couldn't stop ${name}.`,
  restartFailed: (name: string) => `Couldn't restart ${name}.`,
  /** A Stop or a Restart whose reply was lost. */
  unconfirmed: (action: 'Stop' | 'Restart', name: string) =>
    `${action} of ${name} is unconfirmed.`,
  /** A control for a run that ended before it arrived changes nothing. */
  stale: (action: 'Stop' | 'Restart') => `${action} didn't run.`,
  staleBody: (name: string) =>
    `${name} started again first. ${servicesCopy.latestState}`,
} as const

/** The words of the log of a service. */
export const serviceLogCopy = {
  title: (name: string) => `Log of ${name}`,
  label: (name: string) => `Output of ${name}`,
  omitted: 'Earlier output is left out.',
  empty: (name: string) => `Output shows here when ${name} prints it.`,
  loading: 'Loading the log',
  failed: "The log couldn't load.",
  reload: 'Reload',
  retry: 'Try again',
  close: 'Close',
} as const
