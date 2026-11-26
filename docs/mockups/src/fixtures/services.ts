import type { ServiceSource } from '../../../../src/shared/generated/ServiceSource'
import type {
  ServiceEntry,
  ServicePhase,
} from '../../../../src/ui/components/tools/serviceCopy'
import { workspaceSessions } from './sessions'

/**
 * The services of Checkout address autocomplete, `W-395`. The agent of the
 * first session started `web`, the dev server of the shop. A member started
 * `storybook` with the command of the cloud computer in a terminal, so the
 * workspace matched no session to it. The agent of the second session
 * started `worker`, which syncs postcodes and listens on no port. A list is
 * in the order of the names, so a row keeps its place after a Restart.
 */

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

const local: ServiceSource = { kind: 'local_command' }

const running = (started: string): ServicePhase => ({
  kind: 'running',
  started,
})

/** The dev server of the shop, on port 3000, the port of the open preview. */
export const webService: ServiceEntry = {
  name: 'web',
  label: 'next dev',
  folder: null,
  phase: running('12m ago'),
  ports: [3000],
  source: firstSession,
}

const storybook: ServiceEntry = {
  name: 'storybook',
  label: 'storybook dev',
  folder: 'packages/ui',
  phase: running('40m ago'),
  ports: [6006],
  source: local,
}

/** The postcode sync, which listens on no port and has printed nothing. */
export const workerService: ServiceEntry = {
  name: 'worker',
  label: 'sync-postcodes.mjs',
  folder: null,
  phase: running('8m ago'),
  ports: [],
  source: secondSession,
}

/**
 * The detected servers that each service runs: `web` the dev server on
 * port 3000, `storybook` Storybook on port 6006, and `dev` both. A list
 * that holds the service shows them in its row, not under Servers. With
 * no such service, as in an empty report, they are plain servers.
 */
export const serviceServers: Readonly<
  Partial<Record<string, readonly number[]>>
> = {
  web: [3000],
  storybook: [6006],
  dev: [3000, 6006],
}

/** The three services while they run. */
export const runningServices: readonly ServiceEntry[] = [
  storybook,
  webService,
  workerService,
]

/**
 * One service with several ports: `turbo dev` runs the shop, the admin,
 * the API, the database studio, Storybook, a Worker, the debugger of
 * Node, the hot reload of Vite, and a live reload, each on its own port.
 * The row lists every port, and the line of the ports wraps.
 */
export const severalPortsServices: readonly ServiceEntry[] = [
  {
    name: 'dev',
    label: 'turbo dev',
    folder: null,
    phase: running('20m ago'),
    ports: [3000, 3001, 4000, 5555, 6006, 8787, 9229, 24678, 35729],
    source: firstSession,
  },
  workerService,
]

/** `web` in one phase, the other services as they run. */
function withWeb(phase: ServicePhase, ports: readonly number[] = [3000]) {
  return [storybook, { ...webService, phase, ports }, workerService]
}

/** While the Stop of `web` runs. */
export const stoppingServices = withWeb({ kind: 'stopping' })

/** After the Stop of `web`: it listens on no port any more. */
export const stoppedServices = withWeb({ kind: 'stopped', at: 'just now' }, [])

/** While the Restart of `web` runs. */
export const restartingServices = withWeb({ kind: 'restarting' })

/** After the Restart of `web`: a new run, which started just now. */
export const restartedServices = withWeb(running('just now'))

/**
 * The ends of runs: `seed` ran to its end, the run of `storybook` failed
 * with exit code 1, and the command of `emails` did not start, because its
 * program is not installed. Their records stay until the cloud computer
 * stops.
 */
export const endedServices: readonly ServiceEntry[] = [
  {
    name: 'emails',
    label: 'email dev',
    folder: 'packages/emails',
    phase: { kind: 'failed', result: { kind: 'start_failed' }, at: '1m ago' },
    ports: [],
    source: secondSession,
  },
  {
    name: 'seed',
    label: 'seed.mjs',
    folder: null,
    phase: {
      kind: 'ended',
      result: { kind: 'exit', code: 0 },
      at: '6m ago',
    },
    ports: [],
    source: firstSession,
  },
  {
    ...storybook,
    phase: {
      kind: 'failed',
      result: { kind: 'exit', code: 1 },
      at: '2m ago',
    },
    ports: [],
  },
  webService,
]

/** `storybook` after the cloud computer ran out of memory. */
export const memoryService: ServiceEntry = {
  ...storybook,
  phase: { kind: 'failed', result: { kind: 'out_of_memory' }, at: '1m ago' },
  ports: [],
}

/** The list after the memory failure of `storybook`. */
export const memoryServices: readonly ServiceEntry[] = [
  memoryService,
  webService,
  workerService,
]

/**
 * The end of the log of `web`, as the cloud computer filters it: plain
 * text, with the value of the org's secret env var as "[redacted]". The
 * log holds more than the app reads, so the view says that earlier output
 * is left out.
 */
export const webLog: readonly string[] = [
  '   ▲ Next.js 15.2.4',
  '   - Local:        http://localhost:3000',
  '   - Environments: .env.local',
  ' ✓ Starting...',
  ' ✓ Ready in 1.9s',
  ' ○ Compiling /checkout ...',
  ' ✓ Compiled /checkout in 2.4s (812 modules)',
  ' GET /checkout 200 in 2716ms',
  ' Postcode lookup key: [redacted]',
  ' GET /api/address?q=221B 200 in 84ms',
  ' GET /api/address?q=221B%20Baker 200 in 61ms',
  ' ✓ Compiled /api/address in 318ms (420 modules)',
  ' GET /api/address?q=221B%20Baker%20St 200 in 57ms',
  ' GET /checkout/shipping 200 in 143ms',
]

/**
 * The end of the log of `storybook` before the cloud computer ran out of
 * memory. Its output stops at the kill.
 */
export const memoryLog: readonly string[] = [
  'info => Starting manager..',
  'info => Starting preview..',
  'info Using tsconfig paths for react-docgen',
  '<i> [webpack-dev-middleware] wait until bundle finished',
  '10% building 1/5 entries 342/1180 dependencies 12/187 modules',
  '38% building 3/5 entries 1830/4211 dependencies 640/1903 modules',
  '71% building 4/5 entries 3954/6020 dependencies 2788/3102 modules',
]
