/**
 * The words of the services of the Preview tool: the list, the menu of a
 * row, the question before Stop, the results of a control, and the log.
 * A service is a named server that runs outside every agent turn, until
 * the cloud computer stops. This module imports no fixture, so the app can
 * use it too. Its words take plain values or the types of the report. The
 * sample shapes below serve only the mockups.
 */

import type { ServiceProcessResult } from '../../../shared/generated/ServiceProcessResult'
import type { ServiceSource } from '../../../shared/generated/ServiceSource'
import type { ServiceState } from '../../../shared/generated/ServiceState'
import { nameLabel } from '../../../shared/name-label'

/**
 * The state that a row shows: the state of the run from the latest report,
 * or a Stop or a Restart that runs.
 */
export type ServiceShownState = ServiceState | 'stopping' | 'restarting'

/**
 * The state of a sample service: its shown state, with the times that the
 * row shows, such as `12m ago`, and the result of an ended run.
 */
export type ServicePhase =
  | { kind: 'running'; started: string }
  | { kind: 'stopping' }
  | { kind: 'restarting' }
  | { kind: 'stopped'; at: string }
  | { kind: 'ended'; result: ServiceProcessResult; at: string }
  | { kind: 'failed'; result: ServiceProcessResult; at: string }

/**
 * A sample service as the Preview tool lists it: its exact name, the
 * filtered label of its program and its folder, each null when the report
 * has none, its state, the ports that it listens on, and where it started.
 * The source is context, not the name of a person, and it gives no rights.
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
  /** The title of the notice after a first read of the list that failed. */
  loadFailed: "The services didn't load",
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
export const serviceStateLabels: Readonly<Record<ServiceShownState, string>> = {
  running: 'Running',
  stopping: 'Stopping…',
  restarting: 'Restarting…',
  stopped: 'Stopped',
  ended: 'Ended',
  failed: 'Failed',
}

/** The result of a run, such as `Exit code 1` or `Out of memory`. */
function serviceResultText(result: ServiceProcessResult): string {
  switch (result.kind) {
    case 'exit':
      return `Exit code ${result.code}`
    case 'signal':
      return `Signal ${result.signal}`
    case 'out_of_memory':
      return servicesCopy.memory
    case 'start_failed':
      return servicesCopy.notStarted
  }
}

/** The words after the state of a run that runs, such as `Started 12m ago`. */
export function serviceStartedText(ago: string): string {
  return `Started ${ago}`
}

/**
 * The words after the state of a run that ended: its result and the time of
 * its end, such as `Exit code 1 · 2m ago`. Without a result, the time alone.
 */
export function serviceEndedText(
  result: ServiceProcessResult | null,
  ago: string,
): string {
  return result === null ? ago : `${serviceResultText(result)} · ${ago}`
}

/**
 * The words after the state: the start of a run, or the result and the
 * time of its end. A Stop shows the time alone, and a control that runs
 * shows none.
 */
export function servicePhaseDetail(phase: ServicePhase): string | null {
  switch (phase.kind) {
    case 'running':
      return serviceStartedText(phase.started)
    case 'stopping':
    case 'restarting':
      return null
    case 'stopped':
      return phase.at
    case 'ended':
    case 'failed':
      return serviceEndedText(phase.result, phase.at)
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
 * The tooltip and the spoken name of a service: its name, the label of its
 * program, and its folder, such as `storybook, storybook dev in packages/ui`.
 */
export function serviceDescription(
  name: string,
  program: string | null,
  folder: string | null,
): string {
  const label = program === null ? '' : `, ${program}`
  const place = folder === null ? '' : ` in ${folder}`
  return `${name}${label}${place}`
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
