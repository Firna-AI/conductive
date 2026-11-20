import {
  runnerWarningFields,
  type RunnerDiagnosticIdentity,
} from '../chat/runner-diagnostics'
import { warnWorker } from '../warnings'

export function warnProviderStop(
  workspaceId: string,
  providerAccount: string,
  connection: RunnerDiagnosticIdentity | null,
): void {
  warnWorker({
    kind: 'workspace_provider_stopped',
    ...runnerWarningFields(workspaceId, connection),
    providerAccount,
  })
}
