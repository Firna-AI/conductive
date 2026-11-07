import type { DeviceCommandRecord } from '../../src/shared/device'
import type { Workspace, WorkspaceState } from '../../src/shared/workspaces'
import type { WorkspaceChat } from '../chat/backend'
import type { ChatStorage } from '../chat/types'
import type { AppEnv } from '../env'
import {
  readDeviceWorkspace,
  enterDeviceInput,
  restoreDeviceInput,
} from './data'

const INPUT_KEY = 'devices:v1:input-state'
interface InputState {
  previous: WorkspaceState
}
/** A conditional restore cannot replace a later lifecycle state. */
export async function publishDeviceState(
  storage: ChatStorage,
  chat: WorkspaceChat,
  env: AppEnv,
  request: DeviceCommandRecord,
  waiting: boolean,
  now = Date.now(),
): Promise<void> {
  let row = await readDeviceWorkspace(env.DB, request.workspaceId)
  if (!row) return
  const baseline = await storage.get<InputState>(INPUT_KEY)
  if (
    waiting &&
    ['working', 'ready', 'unread', 'starting'].includes(row.state)
  ) {
    const updatedAt = Math.max(now, row.updatedAt + 1)
    // This marker also repairs a restart between the KV write and D1 update.
    await storage.put(INPUT_KEY, { previous: row.state })
    await enterDeviceInput(env.DB, row.id, row.state, updatedAt)
  } else if (!waiting && baseline) {
    await restoreDeviceInput(env.DB, row.id, baseline.previous, now)
    await storage.delete(INPUT_KEY)
  }
  row = await readDeviceWorkspace(env.DB, request.workspaceId)
  const session = await chat.store.run(() =>
    chat.store.read(request.workspaceId, (view) =>
      view.session(request.sessionId),
    ),
  )
  if (!row || !session) return
  const workspace: Workspace = {
    id: row.id,
    orgId: row.orgId,
    repositoryId: row.repositoryId,
    sectionId: row.sectionId,
    owner: {
      id: row.ownerId,
      githubLogin: row.githubLogin,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
    },
    name: row.name,
    branch: row.branch,
    choice: session.choice,
    state: row.state,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    archivedAt: row.archivedAt,
  }
  await chat.appendWorkspaceEvent(
    request.workspaceId,
    {
      type: 'workspace.updated',
      workspace,
    },
    now,
  )
}
