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
import { phonePaths } from '../phonePaths'
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

/**
 * The pages that the controls of the services and of the views over them
 * open: the list, the menu of `web`, a log, the result of a Stop, and the
 * chat of the session that started a service.
 */
type ServicePages = Partial<Record<keyof typeof servicePaths, string>> & {
  sessions?: Readonly<Record<string, string>>
}

/**
 * The pages of the web app, and beside them the pages of the phone apps,
 * where the catalogue draws one. The web pages draw the Preview of the web
 * app, so under the mark of the phone apps a control whose page the phone
 * map does not hold shows without a link.
 */
const servicePages: Readonly<Record<'web' | 'phone', ServicePages>> = {
  web: {
    ...servicePaths,
    sessions: {
      [workspaceSessions[0].key]: paths.app,
      [workspaceSessions[1].key]: paths.sessionChips,
    },
  },
  phone: {
    list: phonePaths.browserTool,
    menu: phonePaths.browserToolMenu,
    log: phonePaths.browserToolLog,
    emptyLog: phonePaths.browserToolEmptyLog,
  },
}

/** The screens that the drawn controls of a row lead to. */
function linksFor(pages: ServicePages, service: ServiceEntry): ServiceLinks {
  const failedForMemory =
    service.phase.kind === 'failed' &&
    service.phase.result.kind === 'out_of_memory'
  const logs: Readonly<Record<string, string | undefined>> = {
    [webService.name]: pages.log,
    [workerService.name]: pages.emptyLog,
  }
  const source = service.source
  const session = workspaceSessions.find(
    (each) => source.kind === 'session' && each.title === source.title,
  )
  return {
    menu: service.name === webService.name ? pages.menu : undefined,
    log: failedForMemory ? pages.memoryLog : logs[service.name],
    source: session ? pages.sessions?.[session.key] : undefined,
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

/**
 * The services above the servers of the Preview tool, when the report has
 * them. Under the mark of the phone apps, `phoneApp`, the controls open
 * the pages of the phone apps, and each port opens `portPage`.
 */
export function previewServicesOf(
  state: WorkspaceState,
  viewport: Viewport,
  phone: { phoneApp: boolean; portPage?: string },
): PreviewServices | undefined {
  const services = servicesOf(state)
  if (services === null) return undefined
  const pages = servicePages[phone.phoneApp ? 'phone' : 'web']
  const mobile = viewport === 'mobile'
  const shown = !mobile && state.tab === 'preview' ? openPort : null
  const controls = serviceControls(state)
  const menu =
    controls && state.serviceView === 'menu'
      ? { name: webService.name, anchored: !mobile }
      : undefined
  // Try again of a read that failed shows the list that it reads.
  const failed =
    state.services === 'load-failed' ? { retryTo: pages.list } : undefined
  return {
    section: (
      <ServiceSection
        controls={controls}
        current={shown}
        failed={failed}
        linksFor={(service) => linksFor(pages, service)}
        menu={menu}
        portPage={phone.portPage}
        services={services}
      />
    ),
    servers: serversBeside(state, services, mobile),
  }
}

/** The log of `web` in one state of its read, which Close leaves. */
function webLogView(
  read: ServiceLogRead,
  viewport: Viewport,
  closeTo: string | undefined,
): ReactNode {
  return (
    <ServiceLogView
      closeTo={closeTo}
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
 * the right to restart the software, no menu and no question opens. Under
 * the mark of the phone apps, `phoneApp`, the controls open the pages of
 * the phone apps.
 */
export function serviceOverlay(
  state: WorkspaceState,
  viewport: Viewport,
  phoneApp: boolean,
): ReactNode {
  const services = servicesOf(state)
  const web = services?.find((each) => each.name === webService.name)
  if (!services || !web) return null
  const name = web.name
  const controls = serviceControls(state)
  const pages = servicePages[phoneApp ? 'phone' : 'web']
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
          cancelTo={pages.list}
          service={web}
          stopTo={pages.stopping}
          viewport={viewport}
        />
      ) : null
    case 'log':
      return webLogView(
        { kind: 'lines', lines: webLog, omitted: true },
        viewport,
        pages.list,
      )
    case 'log-loading':
      return webLogView({ kind: 'loading' }, viewport, pages.list)
    case 'log-failed':
      return webLogView(
        { kind: 'failed', message: sandboxNotAnswering },
        viewport,
        pages.list,
      )
    case 'log-empty':
      return (
        <ServiceLogView
          closeTo={pages.list}
          read={{ kind: 'empty' }}
          service={workerService}
          viewport={viewport}
        />
      )
    case 'log-memory':
      return (
        <ServiceLogView
          closeTo={pages.memory}
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
