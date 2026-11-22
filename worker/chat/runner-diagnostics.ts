import { warnWorker } from '../warnings'
import { WarningId, WarningStreamId } from '../warning-values'
import type { RunnerConnectionState } from './runner-connection-state'

export type RunnerDiagnosticIdentity = Pick<
  RunnerConnectionState,
  'id' | 'workspace' | 'streamId' | 'processStartId' | 'protocolVersion'
>

export function runnerWarningFields(
  workspaceId: string,
  connection: RunnerDiagnosticIdentity | null,
) {
  const runner = connection?.workspace.id === workspaceId ? connection : null
  return {
    workspaceId: WarningId.checked(workspaceId),
    connectionId: runner ? WarningId.checked(runner.id) : null,
    streamId: runner?.streamId
      ? WarningStreamId.checked(runner.streamId)
      : null,
    processStartId:
      runner?.processStartId === null || runner?.processStartId === undefined
        ? null
        : WarningStreamId.checked(runner.processStartId),
    protocolVersion: runner?.protocolVersion ?? null,
  }
}

export function warnRunnerConnection(
  kind: 'runner_connected' | 'runner_disconnected',
  connection: RunnerDiagnosticIdentity,
): void {
  warnWorker({
    kind,
    ...runnerWarningFields(connection.workspace.id, connection),
  })
}
