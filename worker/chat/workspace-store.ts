import type { AppEnv } from '../env'
import {
  reportAfterChatChange,
  reportAutomationFirstTurn,
} from './automation-run'
import { ChatStore } from './store'
import { reportTurnEnd } from './turn-end-reports'
import type { ChatDependencies, ChatStorage } from './types'
import type { WorkspaceEventEnvelope } from './workspace-events'
import type { RunnerDiagnosticIdentity } from './runner-diagnostics'
import { storedWorkspaceEventLabels } from './workspace-labels'

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
    async (report) => {
      if (dependencies.sessionWatchAlarm)
        await store.read(report.workspaceId, async (view) => {
          if (await view.watches.active())
            await dependencies.sessionWatchAlarm?.(
              await view.watches.due(dependencies.now()),
            )
        })
      await reportTurnEnd(store, dependencies, publish, report)
    },
    (workspaceId) =>
      reportAfterChatChange(
        () =>
          reportAutomationFirstTurn(
            env.DB,
            store,
            workspaceId,
            dependencies.now(),
          ),
        workspaceId,
        dependencies.now,
        dependencies.automationReportAlarm,
      ),
    runner,
    (workspaceId) => storedWorkspaceEventLabels(env, workspaceId),
  )
  return store
}
