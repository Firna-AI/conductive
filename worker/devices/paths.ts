import {
  DEVICE_COMMAND_PATH,
  DEVICE_CURRENT_PATH,
  DEVICE_SETTINGS_PATH,
} from '../../src/shared/device'

export const DEVICE_INTERNAL_PATH = '/__devices/operation'
export const DEVICE_BROKER_PREFIX = 'devices:v1:user:'
export const deviceBrokerName = (userId: string) =>
  `${DEVICE_BROKER_PREFIX}${userId}`
export const isDeviceMachinePath = (path: string) =>
  path === DEVICE_COMMAND_PATH || path.startsWith(`${DEVICE_COMMAND_PATH}/`)
export function isDeviceAppPath(path: string): boolean {
  return (
    path === '/api/devices/connect' ||
    path === DEVICE_CURRENT_PATH ||
    path === DEVICE_SETTINGS_PATH ||
    /^\/api\/orgs\/[^/]+\/workspaces\/[^/]+\/device-commands(?:\/[^/]+(?:\/approval)?)?$/.test(
      path,
    )
  )
}
export function workspaceDeviceRoute(path: string) {
  const match = path.match(
    /^\/api\/orgs\/([^/]+)\/workspaces\/([^/]+)\/device-commands(?:\/([^/]+)(\/approval)?)?$/,
  )
  if (!match) return null
  return {
    orgId: decodeURIComponent(match[1]),
    workspaceId: decodeURIComponent(match[2]),
    requestId: match[3] ? decodeURIComponent(match[3]) : null,
    approval: Boolean(match[4]),
  }
}
