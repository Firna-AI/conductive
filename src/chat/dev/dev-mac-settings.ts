import {
  failedMessage,
  notSavedMessage,
} from '../../../docs/mockups/src/fixtures/mac'
import type { DeviceSettings, DeviceSettingsOutcome } from '../../shared/device'
import { readDevicePairing } from '../../shared/device-read'
import { record, text } from '../api/json'
import type { DevMac } from './dev-mac'

/** The settings after one change, as the Mac app makes it. */
function changed(
  settings: DeviceSettings,
  operation: Record<string, unknown>,
): DeviceSettings {
  if (operation.action === 'remove-command') {
    const command = text(operation.command)
    return {
      ...settings,
      alwaysAllowedCommands: settings.alwaysAllowedCommands.filter(
        (item) => item !== command,
      ),
    }
  }
  const workspaceId = text(operation.workspaceId)
  return {
    ...settings,
    workspaceWindows: settings.workspaceWindows.filter(
      (item) => item.workspaceId !== workspaceId,
    ),
  }
}

/**
 * Applies one change to the Mac's settings, as the Mac app does, with the
 * outcome of the page's `change` option: made and saved, made but not
 * saved, or not made. The Worker refuses a change of an older pairing.
 * `publish` tells the page of the change.
 */
export function changeMacSettings(
  mac: DevMac,
  body: Record<string, unknown>,
  publish: () => void,
): Response {
  const pairing = readDevicePairing(body)
  if (
    pairing.deviceId !== mac.pairing.deviceId ||
    pairing.connectionId !== mac.pairing.connectionId
  ) {
    const error = {
      code: 'device_forbidden',
      message: 'Open this request on the connected Mac.',
    }
    return Response.json({ error }, { status: 403 })
  }
  const outcomes: Record<
    DeviceSettingsOutcome['status'],
    DeviceSettingsOutcome
  > = {
    done: { status: 'done' },
    'done-not-saved': { status: 'done-not-saved', message: notSavedMessage },
    failed: { status: 'failed', message: failedMessage },
  }
  const outcome = outcomes[mac.outcome]
  if (outcome.status !== 'failed') {
    mac.settings = changed(mac.settings, record(body.operation))
  }
  publish()
  return Response.json({ ...mac.pairing, settings: mac.settings, outcome })
}
