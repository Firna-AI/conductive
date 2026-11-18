import type { DeviceWorkspaceWindow } from '../../../src/shared/device.ts'

/** The longest grant that the permission file can hold: the 15 minutes. */
export const WINDOW_MS = 15 * 60 * 1000

/** A saved grant always has an end time. A grant until Stop is never saved. */
type SavedWindow = DeviceWorkspaceWindow & { expiresAt: number }

function isWindow(value: unknown): value is SavedWindow {
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

/** The text of the permission file. Only the timed grants go into it. */
export function permissionFileText(
  commands: ReadonlySet<string>,
  windows: ReadonlyMap<string, DeviceWorkspaceWindow>,
): { text: string; filed: Set<string> } {
  const timed = [...windows.values()].filter(
    (window) => window.expiresAt !== null,
  )
  return {
    text: JSON.stringify({
      alwaysAllowedCommands: [...commands],
      workspaceWindows: timed,
    }),
    filed: new Set(timed.map((window) => window.workspaceId)),
  }
}

/**
 * Reads the permission file. It throws on a file that is not valid. It
 * drops each grant that ended, or that ends later than 15 minutes from now.
 */
export function readPermissionFile(
  contents: string,
  now: number,
): { commands: Set<string>; windows: SavedWindow[] } {
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
  return {
    commands: new Set(value.alwaysAllowedCommands),
    windows: value.workspaceWindows.filter(
      (window) => window.expiresAt > now && window.expiresAt <= now + WINDOW_MS,
    ),
  }
}
