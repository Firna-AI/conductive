import type { WorkspaceEventEnvelope } from './workspace-events'
import type {
  ActiveRunner,
  ChatDependencies,
  ChatCallbackPublisher,
} from './types'
import type { ChatStore } from './store'
import type { RunnerConnections } from './runner-connections'
import type { RepairDelivery } from './repair-delivery'
import type { RepositoryMoves } from './runner-repository-move'
import type { IncomingRunnerHello } from './runner-input'
import type { WorkspaceServices } from '../services/runtime'
import { prepareRunnerHello } from './runner-handshake'

export async function acceptRunnerHello(
  active: ActiveRunner,
  message: IncomingRunnerHello,
  context: {
    store: ChatStore
    dependencies: ChatDependencies
    publish(events: readonly WorkspaceEventEnvelope[]): void
    connections: RunnerConnections
    repairs: RepairDelivery
    moves: RepositoryMoves
    services: WorkspaceServices
    publisher(workspaceId: string): ChatCallbackPublisher
  },
): Promise<boolean> {
  const welcome = await prepareRunnerHello(
    active,
    message,
    context.store,
    context.dependencies,
    context.publish,
  )
  if (!welcome) return false
  active.streamId = message.streamId
  active.processStartId = message.processStartId
  active.protocolVersion = welcome.protocolVersion
  active.loginKinds = message.loginKinds
  active.repositoryFolder = message.repositoryFolder
  active.fileServer = message.fileServer
  await context.services.negotiate(active, message.services === true)
  active.ready = welcome.ready
  await context.connections.persist(active)
  context.connections.reportConnected(active)
  if (active.ready) context.connections.attachFiles(active)
  await active.peer.send({
    type: 'welcome',
    protocolVersion: welcome.protocolVersion,
    streamId: message.streamId,
    confirmedThrough: welcome.cursor,
    ...(active.services === true ? { services: true } : {}),
    ...(message.completeToolDetails === true
      ? { completeToolDetails: true }
      : {}),
  })
  await context.services.welcomed(active)
  await context.repairs.flush(active)
  await context.moves.check(active)
  await context.dependencies.runnerHello(
    active.workspace.id,
    context.publisher(active.workspace.id),
  )
  if (active.ready)
    await context.dependencies.runnerReady(
      active.workspace.id,
      context.publisher(active.workspace.id),
    )
  return true
}
