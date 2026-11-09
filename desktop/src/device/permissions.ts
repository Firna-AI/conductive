import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'

import type {
  DeviceSettings,
  DeviceSettingsOutcome,
  DeviceWorkspaceWindow,
} from '../../../src/shared/device.ts'
import type { DeviceClock } from './clock.js'
import type { DeviceFiles } from './files.js'

const WINDOW_MS = 15 * 60 * 1000
const ALWAYS_ALLOWED_COMMANDS_LIMIT_BYTES = 900_000

export class AlwaysAllowLimitError extends Error {
  constructor() {
    super(
      'Always allow is full. Remove a saved command in This Mac, or request this command again and choose Allow.',
    )
  }
}

interface PermissionDependencies {
  files: DeviceFiles
  userId: string
  deviceName: string
  clock: DeviceClock
  warn(): void
}

function isWindow(value: unknown): value is DeviceWorkspaceWindow {
  return (
    typeof value === 'object' &&
    value !== null &&
    'workspaceId' in value &&
    typeof value.workspaceId === 'string' &&
    'workspaceName' in value &&
    (value.workspaceName === null || typeof value.workspaceName === 'string') &&
    'expiresAt' in value &&
    typeof value.expiresAt === 'number' &&
    Number.isFinite(value.expiresAt)
  )
}

/** Each authenticated account has separate permissions on this Mac. */
export function createPermissionStore(dependencies: PermissionDependencies) {
  const { files, clock } = dependencies
  const name = `permissions-${createHash('sha256').update(dependencies.userId).digest('hex')}.json`
  let commands = new Set<string>()
  let windows = new Map<string, DeviceWorkspaceWindow>()
  const timers = new Map<string, () => void>()
  let readState: 'pending' | 'loaded' | 'changed' = 'pending'
  const save = (
    nextCommands: Set<string>,
    nextWindows: Map<string, DeviceWorkspaceWindow>,
  ) => {
    files.write(
      name,
      JSON.stringify({
        alwaysAllowedCommands: [...nextCommands],
        workspaceWindows: [...nextWindows.values()],
      }),
    )
    readState = 'changed'
    commands = nextCommands
    windows = nextWindows
  }
  const saveRevocation = (): DeviceSettingsOutcome => {
    try {
      save(commands, windows)
      return { status: 'done' }
    } catch {
      dependencies.warn()
      return {
        status: 'done-not-saved',
        message:
          'This permission change is active, but the Mac could not save it. Try again.',
      }
    }
  }
  const stopWorkspace = (workspaceId: string): DeviceSettingsOutcome => {
    readState = 'changed'
    windows.delete(workspaceId)
    timers.get(workspaceId)?.()
    timers.delete(workspaceId)
    return saveRevocation()
  }
  const schedule = (window: DeviceWorkspaceWindow) => {
    timers.set(
      window.workspaceId,
      clock.after(window.expiresAt - clock.now(), () => {
        timers.delete(window.workspaceId)
        stopWorkspace(window.workspaceId)
      }),
    )
  }
  const retryRead = () => {
    if (readState !== 'pending') return
    try {
      const contents = files.read(name)
      if (contents !== undefined) {
        const value: unknown = JSON.parse(contents)
        if (
          typeof value !== 'object' ||
          value === null ||
          !('alwaysAllowedCommands' in value) ||
          !Array.isArray(value.alwaysAllowedCommands) ||
          !value.alwaysAllowedCommands.every(
            (command: unknown) => typeof command === 'string',
          ) ||
          !('workspaceWindows' in value) ||
          !Array.isArray(value.workspaceWindows) ||
          !value.workspaceWindows.every(isWindow)
        )
          throw new Error('Invalid local permissions')
        commands = new Set(value.alwaysAllowedCommands)
        windows = new Map(
          value.workspaceWindows
            .filter(
              (window) =>
                window.expiresAt > clock.now() &&
                window.expiresAt <= clock.now() + WINDOW_MS,
            )
            .map((window) => [window.workspaceId, window]),
        )
      }
      readState = 'loaded'
      windows.forEach(schedule)
    } catch {
      dependencies.warn()
    }
  }
  retryRead()
  return {
    retryRead,
    permits(command: string, workspaceId: string): boolean {
      return (
        commands.has(command) ||
        (windows.get(workspaceId)?.expiresAt ?? 0) > clock.now()
      )
    },
    allowCommand(command: string): void {
      const nextCommands = new Set([...commands, command])
      if (
        Buffer.byteLength(JSON.stringify([...nextCommands])) >
        ALWAYS_ALLOWED_COMMANDS_LIMIT_BYTES
      )
        throw new AlwaysAllowLimitError()
      save(nextCommands, windows)
    },
    removeCommand(command: string): DeviceSettingsOutcome {
      readState = 'changed'
      commands.delete(command)
      return saveRevocation()
    },
    allowWorkspace(workspaceId: string, workspaceName: string | null): void {
      if ((windows.get(workspaceId)?.expiresAt ?? 0) > clock.now()) return
      const window = {
        workspaceId,
        workspaceName,
        expiresAt: clock.now() + WINDOW_MS,
      }
      save(commands, new Map([...windows, [workspaceId, window]]))
      timers.get(workspaceId)?.()
      schedule(window)
    },
    stopWorkspace,
    settings(): DeviceSettings {
      return {
        deviceName: dependencies.deviceName,
        alwaysAllowedCommands: [...commands],
        workspaceWindows: [...windows.values()]
          .filter((window) => window.expiresAt > clock.now())
          .map((window) => ({ ...window })),
      }
    },
    dispose(): void {
      timers.forEach((cancel) => cancel())
      timers.clear()
    },
  }
}

export type PermissionStore = ReturnType<typeof createPermissionStore>
