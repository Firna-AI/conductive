import type { AppEnv } from '../env'
import { reportRoutineFirstTurn } from './routine-run'
import { ChatStore } from './store'
import { reportTurnEnd } from './turn-end-reports'
import type { ChatDependencies, ChatStorage } from './types'
import type { WorkspaceEventEnvelope } from './workspace-events'

export function createWorkspaceChatStore(
  storage: ChatStorage,
  env: AppEnv,
  dependencies: ChatDependencies,
  publish: (events: readonly WorkspaceEventEnvelope[]) => void,
): ChatStore {
  const store: ChatStore = new ChatStore(
    storage,
    dependencies.now,
    (report) => reportTurnEnd(store, dependencies, publish, report),
    (workspaceId) =>
      reportRoutineFirstTurn(env.DB, store, workspaceId, dependencies.now()),
  )
  return store
}
