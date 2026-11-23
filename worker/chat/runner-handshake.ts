import type { RunnerProtocolVersion } from '../../src/shared/generated/RunnerProtocolVersion'
import type { WorkspaceEventEnvelope } from './workspace-events'
import {
  isSupportedRunnerVersion,
  RUNNER_PROTOCOL_VERSION,
} from '../../src/shared/runner'
import { RunnerFileReports } from '../files/runner-reports'
import { HttpError } from '../http'
import { warnWorker } from '../warnings'
import { WarningId } from '../warning-values'
import type { ChatStore } from './store'
import type { IncomingRunnerHello } from './runner-input'
import { failUnsupportedRunner } from './runner-unsupported'
import type { ActiveRunner, ChatDependencies } from './types'

export async function prepareRunnerHello(
  active: ActiveRunner,
  message: IncomingRunnerHello,
  store: ChatStore,
  dependencies: ChatDependencies,
  publish: (events: readonly WorkspaceEventEnvelope[]) => void,
): Promise<{
  protocolVersion: RunnerProtocolVersion
  cursor: number
  savedReady: boolean
} | null> {
  if (
    active.state.streamId ||
    message.workspaceId !== active.state.workspace.id
  )
    throw new HttpError(
      400,
      'runner_hello_mismatch',
      'The connection is not available.',
    )
  const requiredVersion = await dependencies.readRunnerProtocolVersion(
    active.state.workspace.id,
  )
  if (
    !isSupportedRunnerVersion(message.protocolVersion) ||
    requiredVersion === null ||
    message.protocolVersion < requiredVersion
  ) {
    warnWorker({
      kind: 'runner_protocol_version_mismatch',
      workspaceId: WarningId.checked(active.state.workspace.id),
    })
    if (message.protocolVersion < RUNNER_PROTOCOL_VERSION)
      await failUnsupportedRunner(
        store,
        dependencies,
        publish,
        active.state.workspace.id,
      )
    active.peer.close()
    return null
  }
  const protocolVersion = message.protocolVersion
  return store.change(
    active.state.workspace.id,
    async (transaction) => {
      await new RunnerFileReports(transaction.files).beginStream(
        message.streamId,
      )
      await transaction.output.beginToolStream(message.streamId)
      return {
        protocolVersion,
        cursor: await transaction.repairs.confirmedThrough(
          message.streamId,
          await transaction.cursor(message.streamId),
        ),
        savedReady: await transaction.streamReady(message.streamId),
      }
    },
    publish,
  )
}
