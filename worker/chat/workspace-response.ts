import type { OrderedWorkspaceResponse } from '../../src/shared/workspaces'
import type { AppEnv } from '../env'
import { HttpError } from '../http'
import type { DurableLifecycleState } from '../lifecycle/durable-types'
import type { MaskedStartLog } from '../lifecycle/masked-start-log'
import { readWorkspace, workspaceView } from '../lifecycle/workspace-data'
import type { ChatStore } from './store'
import type { ChatWorkspaceSummary } from './workspace-summary'

export interface OrderedChatWorkspaceResponse {
  response: OrderedWorkspaceResponse
  summary: ChatWorkspaceSummary
}

/** The caller holds the workspace queue for the entire snapshot. */
export async function readChatWorkspaceResponse(
  env: AppEnv,
  store: ChatStore,
  orgId: string,
  workspaceId: string,
  readLifecycle: () => Promise<DurableLifecycleState | undefined>,
  readLog: () => Promise<MaskedStartLog>,
): Promise<OrderedChatWorkspaceResponse> {
  const state = await readLifecycle()
  const storedWorkspaceId = await store.workspaceId()
  if (
    (state && state.workspaceId !== workspaceId) ||
    (storedWorkspaceId && storedWorkspaceId !== workspaceId)
  )
    throw new HttpError(
      404,
      'workspace_not_found',
      'The workspace is not available.',
    )
  const row = await readWorkspace(env.DB, orgId, workspaceId)
  const { summary, title } = await store.read(workspaceId, async (view) => ({
    summary: await view.workspaceSummary(),
    title: (await view.lifecycleRecovery()).title,
  }))
  return {
    response: {
      workspace: {
        ...workspaceView(row),
        ...(title ? { name: title.name } : {}),
      },
      start: state?.start ?? null,
      error: state?.error
        ? {
            ...state.error,
            log: state.error.log ?? ((await readLog()).text || null),
          }
        : null,
      eventNumber: summary.throughEventNumber,
    },
    summary,
  }
}
