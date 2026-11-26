import type { ServiceCatalogue } from '../../shared/generated/ServiceCatalogue'
import type { ServiceRow } from '../../shared/generated/ServiceRow'
import type { ServiceSource } from '../../shared/generated/ServiceSource'
import type { ServiceStatus } from '../../shared/generated/ServiceStatus'
import { memoryLog, webLog } from '../../../docs/mockups/src/fixtures/services'
import { workspaceSessions } from '../../../docs/mockups/src/fixtures/sessions'
import { FAKE_TIME } from './core'

// The services of the fake workspace, as the Worker sends them, with the
// names, labels, sessions, and logs of the mockups at `app/tools/services`.

const minute = 60_000

/** The run of the cloud computer of the fake services. */
export const SERVICE_BOOT = 'boot-1'

const firstSession: ServiceSource = {
  kind: 'session',
  sessionId: workspaceSessions[0].key,
  title: workspaceSessions[0].title,
  agent: 'claude',
}

const secondSession: ServiceSource = {
  kind: 'session',
  sessionId: workspaceSessions[1].key,
  title: workspaceSessions[1].title,
  agent: 'claude',
}

/** A run that started `minutesAgo` minutes before the fake time. */
function runningFor(minutesAgo: number): ServiceStatus {
  return {
    state: 'running',
    startedAt: FAKE_TIME - minutesAgo * minute,
    endedAt: null,
    result: null,
  }
}

/** `web`, the dev server of the shop on port 3000, which a session started. */
export const webRow: ServiceRow = {
  source: firstSession,
  name: 'web',
  program: 'next dev',
  folder: null,
  status: runningFor(12),
  ports: [3000],
  serviceId: 'service-web',
  generation: 'web-1',
}

/** `storybook` on port 6006, which a member started in a terminal. */
const storybookRow: ServiceRow = {
  source: { kind: 'local_command' },
  name: 'storybook',
  program: 'storybook dev',
  folder: 'packages/ui',
  status: runningFor(40),
  ports: [6006],
  serviceId: 'service-storybook',
  generation: 'storybook-1',
}

/** `worker`, the postcode sync, which listens on no port. */
export const workerRow: ServiceRow = {
  source: secondSession,
  name: 'worker',
  program: 'sync-postcodes.mjs',
  folder: null,
  status: runningFor(8),
  ports: [],
  serviceId: 'service-worker',
  generation: 'worker-1',
}

/** The ended runs of `app/tools/services/ended`, with `web` as it runs. */
export const endedRows: readonly ServiceRow[] = [
  {
    source: secondSession,
    name: 'emails',
    program: 'email dev',
    folder: 'packages/emails',
    status: {
      state: 'failed',
      startedAt: FAKE_TIME - 2 * minute,
      endedAt: FAKE_TIME - minute,
      result: { kind: 'start_failed' },
    },
    ports: [],
    serviceId: 'service-emails',
    generation: 'emails-1',
  },
  {
    source: firstSession,
    name: 'seed',
    program: 'seed.mjs',
    folder: null,
    status: {
      state: 'ended',
      startedAt: FAKE_TIME - 7 * minute,
      endedAt: FAKE_TIME - 6 * minute,
      result: { kind: 'exit', code: 0 },
    },
    ports: [],
    serviceId: 'service-seed',
    generation: 'seed-1',
  },
  {
    ...storybookRow,
    status: {
      state: 'failed',
      startedAt: FAKE_TIME - 40 * minute,
      endedAt: FAKE_TIME - 2 * minute,
      result: { kind: 'exit', code: 1 },
    },
    ports: [],
  },
  webRow,
]

/** The three services while they run, in the order of their names. */
export const runningRows: readonly ServiceRow[] = [
  storybookRow,
  webRow,
  workerRow,
]

/** A list of these rows, as the Worker gives it. */
export function serviceList(
  rows: readonly ServiceRow[] = runningRows,
  revision = 1,
): ServiceCatalogue {
  return {
    state: 'ready',
    snapshot: { bootId: SERVICE_BOOT, revision, services: rows },
  }
}

/** The end of the log of `web`, as the Worker filters it. */
export const webLogText = `${webLog.join('\n')}\n`

/** The end of the log of `storybook` before its run failed. */
export const storybookLogText = `${memoryLog.join('\n')}\n`
