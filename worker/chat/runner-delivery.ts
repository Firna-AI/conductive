import type { WorkspaceEventEnvelope } from './workspace-events'
import type { RunnerCommandV1, RunnerLogin } from '../../src/shared/runner'
import type { WorkspaceTurnTokens } from '../model-gateway/workspace'
import { DeliveryState } from './delivery-state'
import { RunnerAccessDenied, SenderAccessDenied } from './login-access'
import { unavailableLoginMessage } from './session-login'
import { ChatOperation } from './operation'
import {
  commandDispatchState,
  dispatchInOrder,
  type DispatchResult,
  type DispatchState,
} from './ordered-dispatch'
import { gatewayRunnerCommand } from './runner-gateway-command'
import type { ChatStore } from './store'
import { TurnLifecycle } from './turn-lifecycle'
import type { ActiveRunner, ChatDependencies, PendingCommand } from './types'
import { AttachmentPreparation } from './attachment-delivery'

export class RunnerDelivery {
  private readonly preparations: AttachmentPreparation
  private readonly dispatch: DeliveryState
  private readonly store: ChatStore
  private readonly dependencies: ChatDependencies
  private readonly publish: (events: readonly WorkspaceEventEnvelope[]) => void
  private readonly forRunningTurn: WorkspaceTurnTokens['forRunningTurn']

  constructor(
    store: ChatStore,
    dependencies: ChatDependencies,
    publish: (events: readonly WorkspaceEventEnvelope[]) => void,
    resume: () => Promise<void>,
    forRunningTurn: WorkspaceTurnTokens['forRunningTurn'],
  ) {
    this.store = store
    this.dependencies = dependencies
    this.publish = publish
    this.forRunningTurn = forRunningTurn
    this.dispatch = new DeliveryState(store, publish)
    this.preparations = new AttachmentPreparation(
      store,
      dependencies,
      publish,
      resume,
    )
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
    await dispatchInOrder(pending, async (command) => {
      const state = await this.send(active, command, isCurrent, detach, () => {
        advanced = true
      })
      if (
        state === 'skip' &&
        !(await this.store.read(active.workspace.id, (view) =>
          view.command(command.commandId),
        ))
      )
        advanced = true
      return state
    })
    return advanced && isCurrent()
  }

  private async send(
    active: ActiveRunner,
    command: PendingCommand,
    isCurrent: () => boolean,
    detach: () => void,
    advance: () => void,
  ): Promise<DispatchState> {
    if (
      !isCurrent() ||
      (await this.store.read(active.workspace.id, (view) =>
        view.commandDelivered(command.commandId, active.id),
      ))
    )
      return 'skip'
    let prepared: DispatchResult<RunnerCommandV1>
    try {
      prepared = await this.command(active, command)
    } catch (error) {
      if (!(error instanceof RunnerAccessDenied)) throw error
      detach()
      return 'skip'
    }
    if (prepared.state !== 'send') return prepared.state
    const outbound = prepared.command
    if (outbound.type === 'turn' || outbound.type === 'message') {
      const state = await this.preparations.check(active, outbound, isCurrent)
      if (state !== 'send') return state
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
      return 'wait'
    if (!isCurrent()) {
      if (outbound.type === 'turn')
        await this.dependencies.turnDispatchFailed(
          active.workspace.id,
          outbound.turnId,
          publish,
        )
      return 'skip'
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
        advance()
        return 'skip'
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
      return 'skip'
    }
    await this.dispatch.sent(active.workspace.id, command, active.id)
    return 'send'
  }

  private async command(
    active: ActiveRunner,
    command: PendingCommand,
  ): Promise<DispatchResult<RunnerCommandV1>> {
    const state = await this.store.read(active.workspace.id, (view) =>
      commandDispatchState(view, command),
    )
    if (state !== 'send') return { state }
    if (command.type === 'interrupt' || command.type === 'model')
      return { state: 'send', command }
    const message = await this.store.read(active.workspace.id, (view) =>
      view.message(command.messageId),
    )
    if (!message) return { state: 'skip' }
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
      await this.failLogin(active.workspace.id, command, error.message)
      return this.unavailable(active.workspace.id, command)
    }
    if (!login || login.agent !== message.choice.agent) {
      await this.failLogin(active.workspace.id, command)
      return this.unavailable(active.workspace.id, command)
    }
    return {
      state: 'send',
      command: {
        type: command.type,
        commandId: command.commandId,
        sessionId: command.sessionId,
        turnId: command.turnId,
        message: { ...message, state: 'sent' },
        attachments: command.attachments,
        login,
      },
    }
  }

  private unavailable(
    workspaceId: string,
    command: PendingCommand,
  ): Promise<DispatchResult<RunnerCommandV1>> {
    return this.store.read(workspaceId, async (view) => ({
      state: (await view.command(command.commandId)) ? 'wait' : 'skip',
    }))
  }

  private async failLogin(
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
