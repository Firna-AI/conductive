import type { WorkspaceEventEnvelope } from '../../src/shared/events'
import type { RunnerCommandV1, RunnerLogin } from '../../src/shared/runner'
import type { WorkspaceTurnTokens } from '../model-gateway/workspace'
import { DeliveryState } from './delivery-state'
import { RunnerAccessDenied, SenderAccessDenied } from './login-access'
import { unavailableLoginMessage } from './session-login'
import { ChatOperation } from './operation'
import { gatewayRunnerCommand } from './runner-gateway-command'
import type { ChatStore } from './store'
import { TurnLifecycle } from './turn-lifecycle'
import type { ActiveRunner, ChatDependencies, PendingCommand } from './types'

export class RunnerDelivery {
  private readonly dispatch: DeliveryState
  private readonly store: ChatStore
  private readonly dependencies: ChatDependencies
  private readonly publish: (events: readonly WorkspaceEventEnvelope[]) => void
  private readonly forRunningTurn: WorkspaceTurnTokens['forRunningTurn']

  constructor(
    store: ChatStore,
    dependencies: ChatDependencies,
    publish: (events: readonly WorkspaceEventEnvelope[]) => void,
    forRunningTurn: WorkspaceTurnTokens['forRunningTurn'],
  ) {
    this.store = store
    this.dependencies = dependencies
    this.publish = publish
    this.forRunningTurn = forRunningTurn
    this.dispatch = new DeliveryState(store, publish)
  }

  /** Called inside the store's serial queue, after the request commits. */
  async flush(
    active: ActiveRunner,
    isCurrent: () => boolean,
    detach: () => void,
  ): Promise<void> {
    if (!active.ready) return
    while (await this.flushPending(active, isCurrent, detach)) {
      if (!isCurrent()) return
    }
  }

  private async flushPending(
    active: ActiveRunner,
    isCurrent: () => boolean,
    detach: () => void,
  ): Promise<boolean> {
    let advanced = false
    const pending = await this.store.read(active.workspace.id, (view) =>
      view.pending(),
    )
    for (const command of pending) {
      if (!isCurrent() || active.delivered.has(command.commandId)) continue
      const current = await this.store.read(active.workspace.id, (view) =>
        view.command(command.commandId),
      )
      if (!current) continue
      let outbound: RunnerCommandV1 | null
      try {
        outbound = await this.command(active, command)
      } catch (error) {
        if (!(error instanceof RunnerAccessDenied)) throw error
        detach()
        return false
      }
      if (!outbound) {
        if (
          !(await this.store.read(active.workspace.id, (view) =>
            view.command(command.commandId),
          ))
        )
          advanced = true
        continue
      }
      await this.store.reportTurnEnds()
      const publish = async (
        event: WorkspaceEventEnvelope['event'],
        occurredAt?: number,
      ) => {
        await this.store.change(
          active.workspace.id,
          (transaction) => transaction.emit(event, occurredAt),
          this.publish,
        )
      }
      if (
        outbound.type === 'turn' &&
        !(await this.dependencies.turnDispatching(
          active.workspace.id,
          {
            turnId: outbound.turnId,
            sessionId: outbound.sessionId,
            senderUserId: outbound.message.sender.id,
          },
          publish,
        ))
      )
        continue
      if (!isCurrent()) {
        if (outbound.type === 'turn')
          await this.dependencies.turnDispatchFailed(
            active.workspace.id,
            outbound.turnId,
            publish,
          )
        return false
      }
      const beganTurn = await this.dispatch.begin(active.workspace.id, command)
      try {
        const outgoing =
          active.protocolVersion === 2
            ? await gatewayRunnerCommand(
                outbound,
                active.workspace.id,
                this.forRunningTurn,
              )
            : outbound
        if (!outgoing) {
          advanced = true
          continue
        }
        await active.peer.send(outgoing)
      } catch {
        detach()
        await this.dispatch.unsent(active.workspace.id, command, beganTurn)
        if (beganTurn && 'turnId' in command)
          await this.dependencies.turnDispatchFailed(
            active.workspace.id,
            command.turnId,
            publish,
          )
        return false
      }
      active.delivered.add(command.commandId)
      await this.dispatch.sent(active.workspace.id, command)
    }
    return advanced
  }

  private async command(
    active: ActiveRunner,
    command: PendingCommand,
  ): Promise<RunnerCommandV1 | null> {
    const canDispatch = await this.store.read(
      active.workspace.id,
      async (view) => {
        const session = await view.session(command.sessionId)
        return session
          ? new TurnLifecycle(view, session).canDispatch(command)
          : false
      },
    )
    if (!canDispatch) return null
    if (command.type === 'interrupt' || command.type === 'model') return command
    const message = await this.store.read(active.workspace.id, (view) =>
      view.message(command.messageId),
    )
    if (!message) return null
    let login: RunnerLogin | null
    try {
      const operation = new ChatOperation(
        this.store,
        active.workspace.id,
        this.dependencies,
        this.publish,
      )
      const observed = await operation.logins.observe(
        command.sessionId,
        active.workspace.tokenHash,
        message.sender.id,
      )
      login = observed.login
    } catch (error) {
      if (!(error instanceof SenderAccessDenied)) throw error
      await this.failCommand(active.workspace.id, command, error.message)
      return null
    }
    if (!login || login.agent !== message.choice.agent) {
      await this.failCommand(active.workspace.id, command)
      return null
    }
    return {
      type: command.type,
      commandId: command.commandId,
      sessionId: command.sessionId,
      turnId: command.turnId,
      message: { ...message, state: 'sent' },
      attachments: command.attachments,
      login,
    }
  }

  private async failCommand(
    workspaceId: string,
    command: Extract<PendingCommand, { messageId: string }>,
    reason?: string,
  ): Promise<void> {
    await this.store.change(
      workspaceId,
      async (transaction) => {
        const turn = await transaction.turn(command.turnId)
        if (!turn || turn.state !== 'queued') return
        const session = await transaction.session(turn.sessionId)
        if (!session || session.activeTurnId !== turn.id) return
        await new TurnLifecycle(transaction, session).fail(
          turn.id,
          reason ?? unavailableLoginMessage(session),
          this.dependencies.randomId,
        )
      },
      this.publish,
    )
  }
}
