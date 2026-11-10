import type { WorkspaceEventEnvelope } from './workspace-events'
import type { RunnerHello } from '../../src/shared/runner'
import { RunnerFileReports } from '../files/runner-reports'
import { HttpError } from '../http'
import { warnWorker } from '../warnings'
import { WarningId } from '../warning-values'
import type { ChatStore } from './store'
import type { ActiveRunner, ChatDependencies } from './types'

export async function prepareRunnerHello(
  active: ActiveRunner,
  message: RunnerHello,
  store: ChatStore,
  dependencies: ChatDependencies,
  publish: (events: readonly WorkspaceEventEnvelope[]) => void,
): Promise<{ cursor: number; ready: boolean } | null> {
  if (active.streamId || message.workspaceId !== active.workspace.id)
    throw new HttpError(
      400,
      'runner_hello_mismatch',
      'The connection is not available.',
    )
  const requiredVersion = await dependencies.readRunnerProtocolVersion(
    active.workspace.id,
  )
  if (requiredVersion === null || message.protocolVersion < requiredVersion) {
    warnWorker({
      kind: 'runner_protocol_version_mismatch',
      workspaceId: WarningId.checked(active.workspace.id),
    })
    active.peer.close()
    return null
  }
  return store.change(
    active.workspace.id,
    async (transaction) => {
      await new RunnerFileReports(transaction.files).beginStream(
        message.streamId,
      )
      return {
        cursor: await transaction.repairs.confirmedThrough(
          message.streamId,
          await transaction.cursor(message.streamId),
        ),
        ready: await transaction.streamReady(message.streamId),
      }
    },
    publish,
  )
}
