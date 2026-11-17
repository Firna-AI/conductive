import { warnWorker } from '../warnings'
import { WarningId, WarningStreamId } from '../warning-values'
import type { ActiveRunner } from './types'

export type RunnerDiagnosticIdentity = Pick<
  ActiveRunner,
  'id' | 'workspace' | 'streamId'
> & { protocolVersion: number | null }

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
