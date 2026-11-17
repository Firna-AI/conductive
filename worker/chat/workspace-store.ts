import type { AppEnv } from '../env'
import { reportAutomationFirstTurn } from './automation-run'
import { ChatStore } from './store'
import { reportTurnEnd } from './turn-end-reports'
import type { ChatDependencies, ChatStorage } from './types'
import type { WorkspaceEventEnvelope } from './workspace-events'
import type { RunnerDiagnosticIdentity } from './runner-diagnostics'

export function createWorkspaceChatStore(
  storage: ChatStorage,
  env: AppEnv,
  dependencies: ChatDependencies,
  publish: (events: readonly WorkspaceEventEnvelope[]) => void,
  runner: () => RunnerDiagnosticIdentity | null,
): ChatStore {
  const store: ChatStore = new ChatStore(
    storage,
    dependencies.now,
    (report) => reportTurnEnd(store, dependencies, publish, report),
    (workspaceId) =>
      reportAutomationFirstTurn(env.DB, store, workspaceId, dependencies.now()),
    runner,
  )
  return store
}
