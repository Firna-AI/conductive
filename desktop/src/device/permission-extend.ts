import type {
  DeviceSettings,
  DeviceSettingsOutcome,
  DeviceWorkspaceWindow,
} from '../../../src/shared/device.ts'
import { WINDOW_MS } from './permission-file.js'

export type WorkspacePermissionIncrease =
  | {
      action: 'start-workspace-until-stop'
      workspaceId: string
      workspaceName: string | null
    }
  | {
      action: 'keep-workspace' | 'extend-workspace'
      workspaceId: string
    }

function preparePermissionWindow(
  current: DeviceWorkspaceWindow | undefined,
  operation: WorkspacePermissionIncrease,
  now: number,
): { window?: DeviceWorkspaceWindow; outcome: DeviceSettingsOutcome } {
  if (operation.action === 'start-workspace-until-stop')
    return {
      window:
        current?.expiresAt === null
          ? current
          : {
              workspaceId: operation.workspaceId,
              workspaceName: operation.workspaceName,
              expiresAt: null,
            },
      outcome: { status: 'done' },
    }
  const extend = operation.action === 'extend-workspace'
  if (extend && current?.expiresAt === null)
    return {
      window: current,
      outcome: {
        status: 'failed',
        message: 'This workspace already allows all commands until you stop.',
      },
    }
  if (!current || (current.expiresAt !== null && current.expiresAt <= now))
    return {
      window: current,
      outcome: {
        status: 'failed',
        message: extend
          ? 'The 15 minutes already ended. Approve a request again to allow all commands.'
          : 'These 15 minutes already ended. The next command asks first.',
      },
    }
  if (extend)
    return {
      window: { ...current, expiresAt: now + WINDOW_MS },
      outcome: { status: 'done' },
    }
  /**
   * Turns the running 15 minutes of a workspace into a grant until Stop,
   * as Keep until I stop in the bar asks.
   */
  return {
    window:
      current.expiresAt === null ? current : { ...current, expiresAt: null },
    outcome: { status: 'done' },
  }
}

export function prepareWorkspacePermission(
  windows: ReadonlyMap<string, DeviceWorkspaceWindow>,
  operation: WorkspacePermissionIncrease,
  dependencies: {
    now: number
    settings(next: ReadonlyMap<string, DeviceWorkspaceWindow>): DeviceSettings
    apply(window: DeviceWorkspaceWindow): void
    warn(): void
  },
) {
  const current = windows.get(operation.workspaceId)
  const prepared = preparePermissionWindow(current, operation, dependencies.now)
  const next = new Map(windows)
  if (prepared.window) next.set(operation.workspaceId, prepared.window)
  return {
    settings: dependencies.settings(next),
    outcome: prepared.outcome,
    commit(): DeviceSettingsOutcome {
      const { window, outcome } = prepared
      if (outcome.status === 'failed' || !window || window === current)
        return outcome
      try {
        dependencies.apply(window)
      } catch {
        dependencies.warn()
        return {
          status: 'failed',
          message: 'The Mac could not extend the 15 minutes. Try again.',
        }
      }
      return { status: 'done' }
    },
  }
}
