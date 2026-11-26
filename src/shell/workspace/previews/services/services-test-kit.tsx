import { routes } from '../../../../app/router'
import type { ServiceCatalogue } from '../../../../shared/generated/ServiceCatalogue'
import { servicePaths } from '../../../../shared/services'
import { byRole, queryByRole } from '../../../../test-support/dom-queries'
import { FakeApiServer } from '../../../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../../../test-support/fixtures/core'
import { press, waitFor } from '../../../../test-support/mount'
import {
  fullReport,
  nextEnvelope,
} from '../../../../test-support/recorded-repairs'
import { bodiesOf } from '../../kept-test-kit'
import { openTab } from '../../wiring-test-kit'

// The helpers of the tests of the services of the Preview tool.

const { org, workspace } = FAKE_IDS

export const serviceRoutes = {
  catalogue: servicePaths.catalogue(org, workspace),
  control: servicePaths.control(org, workspace),
  logs: servicePaths.logs(org, workspace),
}

/**
 * The fake API with the stored report of the detected servers of the
 * mockups, ports 3000, 4321, 4322, 5173, and 6006, and these services. Its
 * list of previews holds the open preview of port 3000.
 */
export function servicesServer(catalogue: ServiceCatalogue): FakeApiServer {
  const server = new FakeApiServer()
  const ports = fullReport('ports.updated')
  server.events.emit(nextEnvelope(server.events, ports, FAKE_TIME))
  server.json('GET', serviceRoutes.catalogue, catalogue)
  return server
}

/** The whole app at the Preview tool of the workspace. */
export function openPreviewTool(
  server: FakeApiServer,
  options: Parameters<typeof openTab>[2] = {},
) {
  return openTab(server, routes.workspace(org, workspace, 'preview'), options)
}

/** The list of the services, once it shows. */
export function shownServices(view: HTMLElement): Promise<HTMLElement> {
  return waitFor(
    () => queryByRole('list', 'Services in this sandbox', view),
    'the list of services',
  )
}

/** Opens the menu of a service, and gives one of its items. */
export async function menuItem(
  service: string,
  item: 'Restart' | 'Stop',
): Promise<HTMLElement> {
  await press(byRole('button', `More for ${service}`))
  return waitFor(
    () => queryByRole('menuitem', item),
    `${item} in the menu of ${service}`,
  )
}

/** The Stop question of a service, once it shows. */
export function stopQuestion(service: string): Promise<HTMLElement> {
  return waitFor(
    () => queryByRole('dialog', `Stop ${service}?`),
    `the Stop question of ${service}`,
  )
}

/** The bodies of the requests of the controls. */
export function sentControls(server: FakeApiServer): Promise<unknown[]> {
  return bodiesOf(server, 'POST', serviceRoutes.control, 0)
}

/** The number of reads of the list of services. */
export function listReads(server: FakeApiServer): number {
  return server.requests.filter(
    (request) =>
      request.method === 'GET' &&
      new URL(request.url).pathname === serviceRoutes.catalogue,
  ).length
}
