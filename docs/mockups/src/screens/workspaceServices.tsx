import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import type { ListeningPort } from '../../../../src/shared/generated/ListeningPort'
import type { PreviewServices } from '../components/tools/PortPreview'
import type { ServiceEntry } from '../../../../src/ui/components/tools/serviceCopy'
import {
  ServiceLogView,
  type ServiceLogRead,
} from '../components/tools/ServiceLog'
import {
  ServiceSection,
  type ServiceLinks,
} from '../components/tools/ServiceList'
import {
  ServiceMenuSheet,
  ServiceResultToast,
  StopServiceDialog,
} from '../components/tools/ServiceParts'
import {
  detectedServers,
  openPort,
  openPorts,
  sandboxNotAnswering,
} from '../fixtures/previews'
import {
  endedServices,
  memoryLog,
  memoryService,
  memoryServices,
  restartedServices,
  restartingServices,
  runningServices,
  serviceServers,
  severalPortsServices,
  stoppedServices,
  stoppingServices,
  webLog,
  webService,
  workerService,
} from '../fixtures/services'
import { workspaceSessions } from '../fixtures/sessions'
import { paths } from '../paths'
import { servicePaths } from '../servicePaths'
import { serviceControls } from './serviceState'
import type { WorkspaceState } from './workspaceState'

type ListState = Exclude<WorkspaceState['services'], 'unsupported'>

const lists: Readonly<Record<ListState, readonly ServiceEntry[]>> = {
  empty: [],
  // A first read that failed shows no row, so no port leaves Servers.
  'load-failed': [],
  running: runningServices,
  ended: endedServices,
  memory: memoryServices,
  ports: severalPortsServices,
  stopping: stoppingServices,
  stopped: stoppedServices,
  restarting: restartingServices,
  restarted: restartedServices,
  'read-only': runningServices,
}

/** The services of the report, or none for software without services. */
function servicesOf(state: WorkspaceState): readonly ServiceEntry[] | null {
  return state.services === 'unsupported' ? null : lists[state.services]
}

/** The screens that the drawn controls of a row lead to. */
function linksFor(service: ServiceEntry): ServiceLinks {
  const failedForMemory =
    service.phase.kind === 'failed' &&
    service.phase.result.kind === 'out_of_memory'
  const logs: Readonly<Record<string, string>> = {
    [webService.name]: servicePaths.log,
    [workerService.name]: servicePaths.emptyLog,
  }
  const source = service.source
  const sessions: Readonly<Record<string, string>> = {
    [workspaceSessions[0].key]: paths.app,
    [workspaceSessions[1].key]: paths.sessionChips,
  }
  const session = workspaceSessions.find(
    (each) => source.kind === 'session' && each.title === source.title,
  )
  return {
    menu: service.name === webService.name ? servicePaths.menu : undefined,
    log: failedForMemory ? servicePaths.memoryLog : logs[service.name],
    source: session ? sessions[session.key] : undefined,
  }
}

/**
 * The servers beside the services: each detected server that no service
 * of the list runs. On desktop, the list also holds each port with a
 * Preview tab that nothing reports, as after the Stop of `web`. A phone
 * leaves out each port with an open preview, because its tab shows it.
 */
function serversBeside(
  state: WorkspaceState,
  services: readonly ServiceEntry[],
  phone: boolean,
): readonly ListeningPort[] {
  const held = services.flatMap((service) => serviceServers[service.name] ?? [])
  const others = detectedServers.filter((server) => !held.includes(server.port))
  if (state.ports !== 'open' && state.ports !== 'adding') return others
  if (phone) return others.filter((server) => !openPorts.includes(server.port))
  const listening = [
    ...services.flatMap((service) => service.ports),
    ...others.map((server) => server.port),
  ]
  const unnamed = openPorts
    .filter((port) => !listening.includes(port))
    .map((port) => ({ port, name: null, folder: null }))
  return [...others, ...unnamed]
}

/** The services above the servers of the Preview tool, when the report has them. */
export function previewServicesOf(
  state: WorkspaceState,
  viewport: Viewport,
): PreviewServices | undefined {
  const services = servicesOf(state)
  if (services === null) return undefined
  const phone = viewport === 'mobile'
  const shown = !phone && state.tab === 'preview' ? openPort : null
  const controls = serviceControls(state)
  const menu =
    controls && state.serviceView === 'menu'
      ? { name: webService.name, anchored: !phone }
      : undefined
  // Try again of a read that failed shows the list that it reads.
  const failed =
    state.services === 'load-failed'
      ? { retryTo: servicePaths.list }
      : undefined
  return {
    section: (
      <ServiceSection
        controls={controls}
        current={shown}
        failed={failed}
        linksFor={linksFor}
        menu={menu}
        services={services}
      />
    ),
    servers: serversBeside(state, services, phone),
  }
}

/** The log of `web` in one state of its read. */
function webLogView(read: ServiceLogRead, viewport: Viewport): ReactNode {
  return (
    <ServiceLogView
      closeTo={servicePaths.list}
      read={read}
      service={webService}
      viewport={viewport}
    />
  )
}

/**
 * What lies over the workspace for its services: the sheet of the menu of
 * `web` on a phone, the question before its Stop, a log, or the toast of a
 * result. Desktop draws the menu beside its button, in the row. Without
 * the right to restart the software, no menu and no question opens.
 */
export function serviceOverlay(
  state: WorkspaceState,
  viewport: Viewport,
): ReactNode {
  const services = servicesOf(state)
  const web = services?.find((each) => each.name === webService.name)
  if (!services || !web) return null
  const name = web.name
  const controls = serviceControls(state)
  switch (state.serviceView) {
    case 'none':
      return null
    case 'menu':
      return controls && viewport === 'mobile' ? (
        <ServiceMenuSheet service={web} />
      ) : null
    case 'stop':
      return controls ? (
        <StopServiceDialog
          cancelTo={servicePaths.list}
          service={web}
          stopTo={servicePaths.stopping}
          viewport={viewport}
        />
      ) : null
    case 'log':
      return webLogView(
        { kind: 'lines', lines: webLog, omitted: true },
        viewport,
      )
    case 'log-loading':
      return webLogView({ kind: 'loading' }, viewport)
    case 'log-failed':
      return webLogView(
        { kind: 'failed', message: sandboxNotAnswering },
        viewport,
      )
    case 'log-empty':
      return (
        <ServiceLogView
          closeTo={servicePaths.list}
          read={{ kind: 'empty' }}
          service={workerService}
          viewport={viewport}
        />
      )
    case 'log-memory':
      return (
        <ServiceLogView
          closeTo={servicePaths.memory}
          read={{ kind: 'lines', lines: memoryLog, omitted: true }}
          service={memoryService}
          viewport={viewport}
        />
      )
    case 'stop-failed':
      return (
        <ServiceResultToast
          name={name}
          result={{ kind: 'failed', message: sandboxNotAnswering }}
          viewport={viewport}
        />
      )
    case 'unconfirmed':
      return (
        <ServiceResultToast
          name={name}
          result={{ kind: 'unconfirmed' }}
          viewport={viewport}
        />
      )
    case 'stale':
      return (
        <ServiceResultToast
          name={name}
          result={{ kind: 'stale' }}
          viewport={viewport}
        />
      )
  }
}
