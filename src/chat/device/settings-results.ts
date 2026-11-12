import type {
  DevicePairing,
  DeviceSettings,
  DeviceSettingsOutcome,
} from '../../shared/device'
import type { SettingsChange } from './device-api'
import { equalPairing } from './device-snapshot'
import { nameLabel } from '../../shared/name-label'

/**
 * The end of one change of the Mac's settings: what the user asked for,
 * what it acts on, and what the Mac did. The Mac either made and saved the
 * change, made it but did not save it, or did not make it.
 */
export interface ChangeResult {
  change: SettingsChange
  /** The exact command, or the name of the workspace of the 15 minutes. */
  subject: string
  outcome: DeviceSettingsOutcome
}

/**
 * The control of a change: Remove of one exact command, or Stop of the 15
 * minutes of one workspace. A control has one change at a time, and keeps
 * the result of its last change.
 */
export function controlOf(change: SettingsChange): string {
  return change.action === 'remove-command'
    ? `command:${change.command}`
    : `window:${change.workspaceId}`
}

/**
 * What a change acts on: the exact command, or the name of a workspace. A
 * Stop whose 15 minutes are gone keeps the name of its last result.
 */
export function subjectOf(
  change: SettingsChange,
  settings: DeviceSettings,
  last: ChangeResult | undefined,
): string {
  if (change.action === 'remove-command') return change.command
  const grant = settings.workspaceWindows.find(
    (window) => window.workspaceId === change.workspaceId,
  )
  return grant
    ? nameLabel(grant.workspaceName)
    : (last?.subject ?? change.workspaceId)
}

/**
 * Whether the control of a result is gone from the settings that show, so
 * that only the result can repeat its change. Null settings show nothing.
 */
export function controlGone(
  result: ChangeResult,
  settings: DeviceSettings | null,
  now: number,
): boolean {
  if (settings === null) return true
  const { change } = result
  if (change.action === 'remove-command') {
    return !settings.alwaysAllowedCommands.includes(change.command)
  }
  return !settings.workspaceWindows.some(
    (grant) =>
      grant.workspaceId === change.workspaceId && grant.expiresAt > now,
  )
}

/** The name of the control that repeats the change of a result. */
export function repeatLabel(result: ChangeResult): string {
  const verb = result.change.action === 'remove-command' ? 'remove' : 'stop'
  return `Try again to ${verb} ${result.subject}`
}

/**
 * Why a change that waited no longer goes: this Mac went away, so no
 * pairing shows, or it reconnected, so the pairing that shows is not the
 * one that the user acted in. Null when the change can go.
 */
export function staleCause(
  shown: DevicePairing | null,
  sent: DevicePairing,
): string | null {
  if (shown === null) {
    return 'This Mac is not available. Try again once it connects.'
  }
  return equalPairing(shown, sent)
    ? null
    : 'This Mac reconnected before the change reached it. Try again.'
}

const titles = {
  'remove-command': {
    done: 'Removed',
    'done-not-saved': 'Removed, not saved',
    failed: 'Not removed',
  },
  'stop-workspace': {
    done: 'Stopped',
    'done-not-saved': 'Stopped, not saved',
    failed: 'Not stopped',
  },
  'extend-workspace': {
    done: 'Extended',
    'done-not-saved': 'Extended, not saved',
    failed: 'Not extended',
  },
} as const satisfies Record<
  SettingsChange['action'],
  Record<DeviceSettingsOutcome['status'], string>
>

/** What became of the change, in a few words. */
export function resultTitle(result: ChangeResult): string {
  return titles[result.change.action][result.outcome.status]
}

/** The cause that the Mac gave, or null for a change that it saved. */
export function resultMessage(result: ChangeResult): string | null {
  return result.outcome.status === 'done' ? null : result.outcome.message
}
