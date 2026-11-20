import type {
  DeviceSettingsOutcome,
  DeviceWorkspaceWindow,
} from '../../../src/shared/device.ts'
import { WINDOW_MS } from './permission-file.js'

export function extendPermissionWindow(
  current: DeviceWorkspaceWindow | undefined,
  macAccessPeriod: number | undefined,
  dependencies: {
    now: number
    save(window: DeviceWorkspaceWindow): void
    warn(): void
  },
): DeviceSettingsOutcome {
  if (current?.expiresAt === null)
    return {
      status: 'failed',
      message: 'This workspace already allows all commands until you stop.',
    }
  if (
    !current ||
    current.expiresAt <= dependencies.now ||
    (macAccessPeriod !== undefined &&
      current.macAccessPeriod !== macAccessPeriod)
  )
    return {
      status: 'failed',
      message:
        'The 15 minutes already ended. Approve a request again to allow all commands.',
    }
  try {
    dependencies.save({ ...current, expiresAt: dependencies.now + WINDOW_MS })
  } catch {
    dependencies.warn()
    return {
      status: 'failed',
      message: 'The Mac could not extend the 15 minutes. Try again.',
    }
  }
  return { status: 'done' }
}
