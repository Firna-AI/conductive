import type { RunnerEvent } from '../../src/shared/runner'
import { array, object, string } from './parse'
import { parseEvent } from './stored-events'

type RetainedKind = 'start.updated' | 'workspace.title'

export interface ReportState {
  latest: {
    [Kind in RetainedKind]: Extract<RunnerEvent, { type: Kind }> | null
  }
  commands: string[]
}

export function emptyReports(): ReportState {
  return {
    latest: { 'start.updated': null, 'workspace.title': null },
    commands: [],
  }
}

export function parseReports(value: unknown): ReportState {
  if (value === undefined) return emptyReports()
  const input = object(value)
  const latest = object(input.latest)
  const start =
    latest['start.updated'] === null
      ? null
      : parseEvent(latest['start.updated'])
  const title =
    latest['workspace.title'] === null
      ? null
      : parseEvent(latest['workspace.title'])
  if (start !== null && start.type !== 'start.updated')
    throw new Error('The retained start report has the wrong type.')
  if (title !== null && title.type !== 'workspace.title')
    throw new Error('The retained workspace name has the wrong type.')
  return {
    latest: { 'start.updated': start, 'workspace.title': title },
    commands: array(input.commands, string),
  }
}

export function retainReport(reports: ReportState, event: RunnerEvent): void {
  if (event.type === 'start.updated') reports.latest['start.updated'] = event
  if (event.type === 'workspace.title')
    reports.latest['workspace.title'] = event
}
