import type { OrderedWorkspaceResponse } from '../../src/shared/workspaces'
import type { WorkspaceSeed } from '../../src/shared/workspace-state-read'
import type { AppEnv } from '../env'
import { HttpError } from '../http'
import type { DurableLifecycleState } from '../lifecycle/durable-types'
import type { MaskedStartLog } from '../lifecycle/masked-start-log'
import { readWorkspace, workspaceView } from '../lifecycle/workspace-data'
import type { ChatStore, ChatTransaction } from './store'
import type { QueueTurn } from './queue-turn'
import type { ChatWorkspaceSummary } from './workspace-summary'
import { canFillWorkspaceTitle } from './workspace-title'
import { readAutomaticTitleWorkspace } from './queries'

export interface OrderedChatWorkspaceResponse {
  response: OrderedWorkspaceResponse
  summary: ChatWorkspaceSummary
}

export type WorkspaceReadRequest = [
  orgId: string,
  workspaceId: string,
  origin: string,
  includeSeed?: boolean,
]

async function workspaceSeed(view: ChatTransaction): Promise<WorkspaceSeed> {
  const { ports, skills, failures } = await view.workspaceReadState()
  return {
    ports,
    skills,
    failures: {
      'workspace.title': failures['workspace.title'],
      'start.updated': failures['start.updated'],
      'ports.updated': failures['ports.updated'],
    },
  }
}

/** The caller holds the workspace queue for the entire snapshot. */
export async function readChatWorkspaceResponse(
  env: AppEnv,
  store: ChatStore,
  turn: QueueTurn,
  [orgId, workspaceId, origin, includeSeed]: WorkspaceReadRequest,
  readLifecycle: () => Promise<DurableLifecycleState | undefined>,
  readLog: () => Promise<MaskedStartLog>,
): Promise<OrderedChatWorkspaceResponse> {
  const readDetail = async () => {
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
    return { state, row: await readWorkspace(env.DB, orgId, workspaceId) }
  }
  const initial = await readDetail()
  const waited =
    includeSeed && (await store.prepareWorkspaceReadState(workspaceId, turn))
  const { state, row } = waited ? await readDetail() : initial
  const { summary, title, seed } = await store.read(
    workspaceId,
    async (view) => ({
      summary: await view.workspaceSummary(),
      title: (await view.lifecycleRecovery()).title,
      seed: includeSeed ? await workspaceSeed(view) : undefined,
    }),
  )
  return {
    response: {
      workspace: {
        ...workspaceView(row, origin),
        ...(title &&
        canFillWorkspaceTitle(
          await readAutomaticTitleWorkspace(env.DB, workspaceId),
        )
          ? { name: title.name }
          : {}),
      },
      start: state?.start ?? null,
      error: state?.error
        ? {
            ...state.error,
            log: state.error.log ?? ((await readLog()).text || null),
          }
        : null,
      eventNumber: summary.throughEventNumber,
      ...(seed && { seed }),
    },
    summary,
  }
}
