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
  active.state.streamId = message.streamId
  active.state.processStartId = message.processStartId
  active.state.protocolVersion = welcome.protocolVersion
  active.state.loginKinds = message.loginKinds
  active.state.repositoryFolder = message.repositoryFolder
  active.state.addsRepositoryFolder = message.addsRepositoryFolder
  active.state.fileServer = message.fileServer
  active.state.capabilityNotices = message.capabilityNotices
  await context.services.negotiate(active, message.services === true)
  active.state.ready =
    welcome.savedReady &&
    !(await context.dependencies.requiresFreshRunnerReady?.())
  await context.connections.persist(active)
  context.connections.reportConnected(active)
  if (active.state.ready) context.connections.attachFiles(active)
  await active.peer.send({
    type: 'welcome',
    protocolVersion: welcome.protocolVersion,
    streamId: message.streamId,
    confirmedThrough: welcome.cursor,
    ...(active.state.services === true ? { services: true } : {}),
    ...(message.completeToolDetails === true
      ? { completeToolDetails: true }
      : {}),
  })
  await context.services.welcomed(active)
  await context.repairs.flush(active)
  await context.moves.check(active)
  await context.dependencies.runnerHello(
    active.state.workspace.id,
    context.publisher(active.state.workspace.id),
  )
  if (active.state.ready)
    await context.dependencies.runnerReady(
      active.state.workspace.id,
      context.publisher(active.state.workspace.id),
    )
  return true
}
