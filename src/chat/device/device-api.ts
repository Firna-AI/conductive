import {
  DEVICE_CURRENT_PATH,
  DEVICE_SETTINGS_PATH,
  deviceApprovalPath,
  deviceCommandsPath,
  type DeviceApprovalAction,
  type DeviceApprovalRequest,
  type DeviceCommandRecord,
  type DevicePairing,
  type DeviceSettings,
  type DeviceSettingsAction,
  type DeviceSettingsRequest,
} from '../../shared/device'
import {
  readDevicePairing,
  readDeviceRecord,
  readDeviceSettings,
} from '../../shared/device-read'
import {
  requestJson,
  type FetchLike,
  type WorkspaceTarget,
} from '../api/client'
import {
  list,
  nullable,
  record,
  UnreadableResponse,
  type Reader,
} from '../api/json'

/** The settings of a Mac, with the pairing of the window that read them. */
export interface PairedSettings {
  pairing: DevicePairing
  settings: DeviceSettings
}

/** A change that the Mac makes to its own settings. */
export type SettingsChange = Exclude<DeviceSettingsAction, { action: 'read' }>

export const readDeviceCommands: Reader<readonly DeviceCommandRecord[]> = (
  value,
) => list(readDeviceRecord)(record(value).requests)

export const readDeviceCurrent: Reader<DevicePairing | null> = (value) =>
  nullable(readDevicePairing)(record(value).device)

export const readPairedSettings: Reader<PairedSettings> = (value) => {
  const body = record(value)
  return {
    pairing: readDevicePairing(body),
    settings: readDeviceSettings(body.settings),
  }
}

/** The Worker took the answer, to pass it to the Mac. It is not the result. */
const readAccepted: Reader<true> = (value) => {
  if (record(value).accepted !== true) throw new UnreadableResponse('accepted')
  return true
}

/** Only the two IDs of a pairing go into a body. */
function pairingOf(pairing: DevicePairing): DevicePairing {
  return { deviceId: pairing.deviceId, connectionId: pairing.connectionId }
}

/**
 * The routes of Mac commands. The IDs of a pairing name a connection, and
 * give no access: the Worker checks the session of the window itself.
 */
export function createDeviceApi(fetch: FetchLike) {
  return {
    commands: (target: WorkspaceTarget) =>
      requestJson(
        fetch,
        'GET',
        deviceCommandsPath(target.orgId, target.workspaceId),
        readDeviceCommands,
      ),
    current: () =>
      requestJson(fetch, 'GET', DEVICE_CURRENT_PATH, readDeviceCurrent),
    answer: (
      target: WorkspaceTarget,
      requestId: string,
      pairing: DevicePairing,
      action: DeviceApprovalAction,
    ) =>
      requestJson(
        fetch,
        'POST',
        deviceApprovalPath(target.orgId, target.workspaceId, requestId),
        readAccepted,
        { ...pairingOf(pairing), action } satisfies DeviceApprovalRequest,
      ),
    settings: () =>
      requestJson(fetch, 'GET', DEVICE_SETTINGS_PATH, readPairedSettings),
    changeSettings: (pairing: DevicePairing, operation: SettingsChange) =>
      requestJson(fetch, 'POST', DEVICE_SETTINGS_PATH, readPairedSettings, {
        ...pairingOf(pairing),
        operation,
      } satisfies DeviceSettingsRequest),
  }
}

export type DeviceApi = ReturnType<typeof createDeviceApi>
