import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'

import type {
  DeviceSettings,
  DeviceSettingsOutcome,
  DeviceWorkspaceWindow,
} from '../../../src/shared/device.ts'
import type { DeviceClock } from './clock.js'
import type { DeviceFiles } from './files.js'
import {
  permissionFileText,
  readPermissionFile,
  WINDOW_MS,
} from './permission-file.js'

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

/**
 * Each authenticated account has separate permissions on this Mac. The
 * store saves the always-allowed commands and the 15 minutes of each
 * workspace. It keeps a grant until Stop only in memory, so the end of the
 * app run, or `endUntilStop` at a sign-out, ends it.
 */
export function createPermissionStore(dependencies: PermissionDependencies) {
  const { files, clock } = dependencies
  const name = `permissions-${createHash('sha256').update(dependencies.userId).digest('hex')}.json`
  let commands = new Set<string>()
  let windows = new Map<string, DeviceWorkspaceWindow>()
  /** The workspaces whose grant the permission file holds. */
  let filed = new Set<string>()
  const timers = new Map<string, () => void>()
  let readState: 'pending' | 'loaded' | 'changed' = 'pending'
  const runs = (window: DeviceWorkspaceWindow | undefined) =>
    window !== undefined &&
    (window.expiresAt === null || window.expiresAt > clock.now())
  const save = (
    nextCommands: Set<string>,
    nextWindows: Map<string, DeviceWorkspaceWindow>,
  ) => {
    const file = permissionFileText(nextCommands, nextWindows)
    files.write(name, file.text)
    readState = 'changed'
    commands = nextCommands
    windows = nextWindows
    filed = file.filed
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
  const cancelTimer = (workspaceId: string) => {
    timers.get(workspaceId)?.()
    timers.delete(workspaceId)
  }
  const stopWorkspace = (workspaceId: string): DeviceSettingsOutcome => {
    // An unread file can still hold a grant of this workspace.
    const saved = readState === 'pending' || filed.has(workspaceId)
    readState = 'changed'
    windows.delete(workspaceId)
    cancelTimer(workspaceId)
    return saved ? saveRevocation() : { status: 'done' }
  }
  const schedule = (window: DeviceWorkspaceWindow) => {
    if (window.expiresAt === null) return
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
        const file = readPermissionFile(contents, clock.now())
        // A grant until Stop that this run gave stays.
        const untilStop = [...windows].filter(
          ([, window]) => window.expiresAt === null,
        )
        commands = file.commands
        windows = new Map([
          ...file.windows.map(
            (window) => [window.workspaceId, window] as const,
          ),
          ...untilStop,
        ])
        filed = new Set(file.windows.map((window) => window.workspaceId))
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
      return commands.has(command) || runs(windows.get(workspaceId))
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
    /** Gives the 15 minutes, and saves them. A grant that runs stays. */
    allowWorkspace(workspaceId: string, workspaceName: string | null): void {
      if (runs(windows.get(workspaceId))) return
      const window = {
        workspaceId,
        workspaceName,
        expiresAt: clock.now() + WINDOW_MS,
      }
      save(commands, new Map([...windows, [workspaceId, window]]))
      cancelTimer(workspaceId)
      schedule(window)
    },
    /** Gives a grant until Stop, only in memory. A grant that runs stays. */
    allowWorkspaceUntilStop(
      workspaceId: string,
      workspaceName: string | null,
    ): void {
      if (runs(windows.get(workspaceId))) return
      cancelTimer(workspaceId)
      windows = new Map([
        ...windows,
        [workspaceId, { workspaceId, workspaceName, expiresAt: null }],
      ])
    },
    /**
     * Turns the running 15 minutes of a workspace into a grant until Stop.
     * The file then drops the 15 minutes. A failed save keeps only the
     * rest of the 15 minutes in the file, which the user already gave.
     */
    keepWorkspace(workspaceId: string): DeviceSettingsOutcome {
      const window = windows.get(workspaceId)
      if (window === undefined || !runs(window))
        return {
          status: 'failed',
          message:
            'These 15 minutes already ended. The next command asks first.',
        }
      if (window.expiresAt === null) return { status: 'done' }
      cancelTimer(workspaceId)
      const next = new Map(windows)
      next.set(workspaceId, { ...window, expiresAt: null })
      windows = next
      try {
        save(commands, next)
      } catch {
        dependencies.warn()
      }
      return { status: 'done' }
    },
    stopWorkspace,
    /** Ends every grant until Stop, such as after a sign-out. */
    endUntilStop(): void {
      windows = new Map(
        [...windows].filter(([, window]) => window.expiresAt !== null),
      )
    },
    settings(): DeviceSettings {
      return {
        deviceName: dependencies.deviceName,
        alwaysAllowedCommands: [...commands],
        workspaceWindows: [...windows.values()]
          .filter(runs)
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
