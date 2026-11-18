import type { WorkspaceChat } from '../chat/backend'
import { WorkspaceGitHub } from '../features/github'
import type { FeatureResult } from '../features/result'
import { HttpError } from '../http'
import type { GitHubRefresh, GitHubSnapshot } from './contracts'
import { createGitHubStatePort } from './chat-store'
import { queuedAccessRace } from './queued-access.test-support'
import { WorkspaceGitHubState } from './workspace-state'

interface RefreshObservation {
  signal: GitHubRefresh
  result: FeatureResult<GitHubSnapshot | null>
}

const refreshes = new Map<string, RefreshObservation[]>()
const refresh = WorkspaceGitHub.prototype.refresh
WorkspaceGitHub.prototype.refresh = async function (workspace, signal) {
  const observed = refreshes.get(workspace.id) ?? []
  refreshes.set(workspace.id, observed)
  try {
    const value = await refresh.call(this, workspace, signal)
    observed.push({ signal, result: { ok: true, value } })
    return value
  } catch (error) {
    if (error instanceof HttpError)
      observed.push({
        signal,
        result: {
          ok: false,
          error: {
            status: error.status,
            code: error.code,
            message: error.message,
          },
        },
      })
    throw error
  }
}

export function nativeGitHubState(
  chat: WorkspaceChat,
  db: D1Database,
  workspaceId: () => string,
) {
  let state: WorkspaceGitHubState | undefined
  const current = () =>
    (state ??= new WorkspaceGitHubState(
      createGitHubStatePort(chat, workspaceId(), async () => {
        throw new Error('Use the production GitHub scheduler for retries.')
      }),
    ))
  return {
    refresh: (...args: Parameters<WorkspaceGitHubState['refresh']>) =>
      current().refresh(...args),
    stored: () => current().stored(),
    accessRace: async (replay: boolean) => {
      const response = await queuedAccessRace(chat, db, replay)
      const body: unknown = await response.json()
      return { status: response.status, body }
    },
    takeRefreshes: async () => {
      const observed = refreshes.get(workspaceId()) ?? []
      refreshes.delete(workspaceId())
      return observed
    },
  }
}

export type NativeGitHubState = ReturnType<typeof nativeGitHubState>
