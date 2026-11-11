import type { WorkspaceEventEnvelope } from './workspace-events'
import type { WorkspaceTurnTokens } from '../model-gateway/workspace'
import { DeliveryState } from './delivery-state'
import { RunnerAccessDenied } from './login-access'
import {
  dispatchInOrder,
  type DispatchResult,
  type DispatchState,
} from './ordered-dispatch'
import {
  gatewayRunnerCommand,
  legacyRunnerCommand,
} from './runner-gateway-command'
import type { ChatStore } from './store'
import type {
  ActiveRunner,
  ChatDependencies,
  PendingCommand,
  PreparedCommand,
  ResolvedCommand,
} from './types'
import { AttachmentPreparation } from './attachment-delivery'
import { RunnerCommandPreparation } from './runner-command-preparation'

export class RunnerDelivery {
  private readonly preparations: AttachmentPreparation
  private readonly commands: RunnerCommandPreparation
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
    this.commands = new RunnerCommandPreparation(store, dependencies, publish)
    this.store = store
    this.dependencies = dependencies
    this.publish = publish
    this.forRunningTurn = forRunningTurn
    this.dispatch = new DeliveryState(store, publish, dependencies)
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
    let prepared: DispatchResult<PreparedCommand>
    try {
      prepared = await this.commands.prepare(active, command)
    } catch (error) {
      if (!(error instanceof RunnerAccessDenied)) throw error
      detach()
      return 'skip'
    }
    if (prepared.state !== 'send') return prepared.state
    const checked = prepared.command
    if (checked.type === 'turn' || checked.type === 'message') {
      const state = await this.preparations.check(active, checked, isCurrent)
      if (state !== 'send') return state
    }
    await this.store.reportTurnEnds()
    const outbound: ResolvedCommand =
      checked.type === 'turn' || checked.type === 'message'
        ? {
            ...checked,
            attachments: await this.dependencies.resolveAttachmentPaths(
              active.workspace.id,
              checked.message.sender.id,
              checked.attachments,
            ),
          }
        : checked
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
    const beganTurn = await this.dispatch.begin(
      active.workspace.id,
      command,
      outbound,
    )
    try {
      const outgoing =
        active.protocolVersion === 2
          ? await gatewayRunnerCommand(
              outbound,
              active.workspace.id,
              this.forRunningTurn,
            )
          : legacyRunnerCommand(outbound)
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
}
