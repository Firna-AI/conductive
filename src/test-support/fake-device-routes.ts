import {
  DEVICE_CURRENT_PATH,
  DEVICE_SETTINGS_PATH,
  deviceApprovalPath,
  deviceCommandsPath,
  type DeviceCommandsResponse,
  type DeviceCurrentResponse,
} from '../shared/device'
import type { FakeRouteWriter } from './fake-api-routes'
import { deviceObject, deviceRequired } from '../shared/device-read'
import { workspaceFixtures } from './fixtures/workspaces'
import { FAKE_IDS } from './fixtures/core'
import {
  FAKE_PAIRING,
  fakeMacRequests,
  fakeSettingsReply,
  type FakeMacScenario,
} from './fixtures/devices'

/**
 * Records the replies of Mac commands. The fake workspace holds the
 * requests of `scenario`, and every other workspace holds none. With
 * `onMac`, the window is the Mac app on the Mac that got the requests.
 * Otherwise it is a browser, which has no pairing and no Mac settings.
 */
export function fakeDeviceRoutes(
  routes: FakeRouteWriter,
  scenario: FakeMacScenario,
  onMac: boolean,
  workspaceIds: readonly string[],
) {
  const org = FAKE_IDS.org
  const requests = fakeMacRequests(scenario)
  for (const workspaceId of workspaceIds) {
    const shown: DeviceCommandsResponse = {
      requests: workspaceId === FAKE_IDS.workspace ? requests : [],
    }
    routes.json('GET', deviceCommandsPath(org, workspaceId), shown)
  }
  for (const request of requests) {
    routes.json(
      'POST',
      deviceApprovalPath(org, request.workspaceId, request.requestKey),
      { accepted: true },
      202,
    )
  }
  const current: DeviceCurrentResponse = { device: onMac ? FAKE_PAIRING : null }
  routes.json('GET', DEVICE_CURRENT_PATH, current)
  if (!onMac) {
    const error = {
      error: {
        code: 'device_unavailable',
        message: 'The Mac is not available.',
      },
    }
    routes.json('GET', DEVICE_SETTINGS_PATH, error, 409)
    routes.json('POST', DEVICE_SETTINGS_PATH, error, 409)
    return
  }
  let reply = fakeSettingsReply()
  routes.json('GET', DEVICE_SETTINGS_PATH, reply)
  routes.handle('POST', DEVICE_SETTINGS_PATH, async (request) => {
    const body = deviceObject(await request.json())
    const operation = deviceObject(body.operation)
    if (operation.action === 'start-workspace-until-stop') {
      const workspaceId = deviceRequired(operation.workspaceId)
      const fixtures = workspaceFixtures()
      const workspace = [
        ...fixtures.workspaces.workspaces,
        fixtures.created.workspace,
      ].find((item) => item.id === workspaceId)
      reply = fakeSettingsReply({
        ...reply.settings,
        workspaceWindows: [
          ...reply.settings.workspaceWindows.filter(
            (item) => item.workspaceId !== workspaceId,
          ),
          {
            workspaceId,
            workspaceName: workspace?.name ?? null,
            expiresAt: null,
          },
        ],
      })
      routes.json('GET', DEVICE_SETTINGS_PATH, reply)
    }
    return Response.json(reply)
  })
}
