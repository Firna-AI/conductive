import type { ServiceControlOutcome } from '../shared/generated/ServiceControlOutcome'
import type { ServiceControlRequest } from '../shared/generated/ServiceControlRequest'
import type { ServiceLogResult } from '../shared/generated/ServiceLogResult'
import type { ServiceRow } from '../shared/generated/ServiceRow'
import { sandboxNotAnswering } from '../../docs/mockups/src/fixtures/previews'
import {
  readServiceControlRequest,
  readServiceLogRequest,
} from '../shared/service-inputs'
import { servicePaths } from '../shared/services'
import type { FakeRouteWriter } from './fake-api-routes'
import { FAKE_IDS } from './fixtures/core'
import {
  endedRows,
  runningRows,
  serviceList,
  storybookLogText,
  webLogText,
} from './fixtures/services'

/**
 * The services that the fake serves: as they run, with ended runs, an
 * empty report, or a first read that fails.
 */
export const fakeServiceStates = [
  'running',
  'ended',
  'empty',
  'load-failed',
] as const
export type FakeServiceState = (typeof fakeServiceStates)[number]

const firstRows: Readonly<Record<FakeServiceState, readonly ServiceRow[]>> = {
  running: runningRows,
  ended: endedRows,
  empty: [],
  'load-failed': [],
}

const logs: Readonly<Record<string, string>> = {
  web: webLogText,
  storybook: storybookLogText,
}

/** The answer of a control of one row, and the row after it. */
function answer(
  row: ServiceRow,
  request: ServiceControlRequest,
  now: number,
  ports: readonly number[],
): { outcome: ServiceControlOutcome; row: ServiceRow } {
  if (row.name === 'storybook' && request.action === 'restart') {
    const error = {
      code: 'service_restart_failed',
      message: sandboxNotAnswering,
    }
    return { outcome: { state: 'failed', error }, row }
  }
  if (row.name === 'worker' && request.action === 'stop')
    return { outcome: { state: 'unconfirmed' }, row }
  if (request.action === 'stop') {
    if (row.status.state !== 'running')
      return { outcome: { state: 'unchanged' }, row }
    const status = {
      ...row.status,
      state: 'stopped' as const,
      endedAt: now,
      result: { kind: 'signal' as const, signal: 15 },
    }
    return { outcome: { state: 'applied' }, row: { ...row, status, ports: [] } }
  }
  const generation = `${row.serviceId}-${now}`
  const status = {
    state: 'running' as const,
    startedAt: now,
    endedAt: null,
    result: null,
  }
  return {
    outcome: { state: 'applied' },
    row: { ...row, status, ports, generation },
  }
}

/**
 * Serves the services of the fake workspace, as the Worker does, for the
 * development page. Stop and Restart of `web` change the list: a Stop ends
 * its run and its port, and a Restart starts a new run. A Restart of
 * `storybook` fails with the message of the server, and a Stop of `worker`
 * loses its reply, so each toast of a result shows. Each control answers
 * after `hold` ms, so its row shows it while it runs.
 */
export function serveFakeServices(
  routes: FakeRouteWriter,
  state: FakeServiceState,
  options: { now: () => number; hold: number },
): void {
  const { org, workspace } = FAKE_IDS
  let rows = [...firstRows[state]]
  let revision = 1
  const firstPorts = new Map(rows.map((row) => [row.serviceId, row.ports]))
  routes.handle('GET', servicePaths.catalogue(org, workspace), async () =>
    state === 'load-failed'
      ? Response.json(
          {
            error: {
              code: 'sandbox_unavailable',
              message: sandboxNotAnswering,
            },
          },
          { status: 502 },
        )
      : Response.json(serviceList(rows, revision)),
  )
  routes.handle('POST', servicePaths.control(org, workspace), async (http) => {
    const request = readServiceControlRequest(await http.json())
    await new Promise((resolve) => setTimeout(resolve, options.hold))
    const row = rows.find(
      (each) =>
        each.serviceId === request.target.serviceId &&
        each.generation === request.target.generation,
    )
    if (!row) return Response.json({ request, outcome: { state: 'stale' } })
    const next = answer(
      row,
      request,
      options.now(),
      firstPorts.get(row.serviceId) ?? [],
    )
    if (next.row !== row) {
      rows = rows.map((each) => (each === row ? next.row : each))
      revision += 1
    }
    return Response.json({ request, outcome: next.outcome })
  })
  routes.handle('POST', servicePaths.logs(org, workspace), async (http) => {
    const request = readServiceLogRequest(await http.json())
    const row = rows.find((each) => each.serviceId === request.target.serviceId)
    const text = row ? (logs[row.name] ?? '') : ''
    const result: ServiceLogResult =
      row?.generation === request.target.generation
        ? { state: 'ready', text, omitted: text !== '' }
        : { state: 'stale' }
    return Response.json({ request, result })
  })
}
