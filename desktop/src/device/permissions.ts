import { createHash } from 'node:crypto'

import type {
  DeviceSettings,
  DeviceWorkspaceWindow,
} from '../../../src/shared/device.ts'
import type { DeviceClock } from './clock.js'
import type { DeviceFiles } from './files.js'

const WINDOW_MS = 15 * 60 * 1000
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
    typeof value.workspaceName === 'string' &&
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
  } catch {
    dependencies.warn()
  }
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
    commands = nextCommands
    windows = nextWindows
  }
  const stopWorkspace = (workspaceId: string) => {
    const next = new Map(windows)
    next.delete(workspaceId)
    save(commands, next)
    timers.get(workspaceId)?.()
    timers.delete(workspaceId)
  }
  const schedule = (window: DeviceWorkspaceWindow) => {
    timers.set(
      window.workspaceId,
      clock.after(window.expiresAt - clock.now(), () => {
        timers.delete(window.workspaceId)
        // The deadline applies even when writing the expired snapshot fails.
        try {
          stopWorkspace(window.workspaceId)
        } catch {
          dependencies.warn()
        }
      }),
    )
  }
  windows.forEach(schedule)
  return {
    permits(command: string, workspaceId: string): boolean {
      return (
        commands.has(command) ||
        (windows.get(workspaceId)?.expiresAt ?? 0) > clock.now()
      )
    },
    allowCommand(command: string): void {
      save(new Set([...commands, command]), windows)
    },
    removeCommand(command: string): void {
      const next = new Set(commands)
      next.delete(command)
      save(next, windows)
    },
    allowWorkspace(workspaceId: string, workspaceName: string): void {
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
