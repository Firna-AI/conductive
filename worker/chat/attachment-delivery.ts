import type { WorkspaceEventEnvelope } from '../../src/shared/events'
import type {
  RunnerTurn,
  RunnerMessageDuringTurn,
} from '../../src/shared/runner'
import { HttpError } from '../http'
import type { DispatchState } from './ordered-dispatch'
import type { ChatStore } from './store'
import { TurnLifecycle } from './turn-lifecycle'
import type { ActiveRunner, ChatDependencies } from './types'

type MessageCommand = RunnerTurn | RunnerMessageDuringTurn
interface Preparation {
  runner: ActiveRunner
  ready: boolean
  sandboxId: string | null
}

/** Provider work runs outside the queue. Its completion rechecks command ownership inside it. */
export class AttachmentPreparation {
  private readonly pending = new Map<string, Preparation>()
  private readonly store: ChatStore
  private readonly dependencies: ChatDependencies
  private readonly publish: (events: readonly WorkspaceEventEnvelope[]) => void
  private readonly resume: () => Promise<void>
  constructor(
    store: ChatStore,
    dependencies: ChatDependencies,
    publish: (events: readonly WorkspaceEventEnvelope[]) => void,
    resume: () => Promise<void>,
  ) {
    this.store = store
    this.dependencies = dependencies
    this.publish = publish
    this.resume = resume
  }

  async check(
    active: ActiveRunner,
    command: MessageCommand,
    isCurrent: () => boolean,
  ): Promise<DispatchState> {
    if (command.attachments.length === 0) return 'send'
    const previous = this.pending.get(command.commandId)
    if (previous && !previous.ready) return 'wait'
    if (
      previous?.runner === active &&
      previous.ready &&
      (previous.sandboxId === null ||
        previous.sandboxId ===
          (await this.dependencies.attachmentSandboxId(
            active.workspace.id,
            command.message.sender.id,
          )))
    )
      return 'send'
    const preparation: Preparation = {
      runner: active,
      ready: false,
      sandboxId: null,
    }
    this.pending.set(command.commandId, preparation)
    const copied = await this.store.read(active.workspace.id, (view) =>
      view.attachmentCopy(command.commandId),
    )
    const work = Promise.resolve()
      .then(() =>
        this.dependencies.prepareAttachments(
          active.workspace.id,
          command.message.sender.id,
          command.message.id,
          command.attachments,
          copied,
        ),
      )
      .then(
        (sandboxId) =>
          this.store.run(async () => {
            if (this.pending.get(command.commandId) !== preparation) return
            const pending = await this.store.read(active.workspace.id, (view) =>
              view.command(command.commandId),
            )
            if (isCurrent() && pending) {
              if (sandboxId !== null)
                await this.store.change(
                  active.workspace.id,
                  (view) =>
                    view.saveAttachmentCopy(command.commandId, sandboxId),
                  this.publish,
                )
              preparation.sandboxId = sandboxId
              preparation.ready = true
            } else this.pending.delete(command.commandId)
            await this.resume()
          }),
        (error: unknown) =>
          this.store.run(async () => {
            if (this.pending.get(command.commandId) !== preparation) return
            this.pending.delete(command.commandId)
            if (!isCurrent()) {
              await this.resume()
              return
            }
            if (await this.failTurn(active.workspace.id, command, error))
              await this.resume()
          }),
      )
    this.dependencies.waitUntil(
      work.catch((error: unknown) => {
        if (this.pending.get(command.commandId) === preparation)
          this.pending.delete(command.commandId)
        try {
          active.peer.close()
        } catch {
          /* The connection already closed. */
        }
        throw error
      }),
    )
    return 'wait'
  }

  private async failTurn(
    workspaceId: string,
    outbound: MessageCommand,
    error: unknown,
  ): Promise<boolean> {
    const failed = await this.store.change(
      workspaceId,
      async (view) => {
        const turn = await view.turn(outbound.turnId)
        if (!turn || (turn.state !== 'queued' && turn.state !== 'running'))
          return undefined
        const session = await view.session(outbound.sessionId)
        if (!session || session.activeTurnId !== turn.id) return undefined
        const running = turn.state === 'running'
        const failed = await view.emit({
          type: 'turn.failed',
          sessionId: session.id,
          turnId: turn.id,
          error:
            error instanceof HttpError
              ? { code: error.code, message: error.message }
              : {
                  code: 'attachment_copy_failed',
                  message:
                    'The attached files could not reach the cloud computer. Try again.',
                },
          retryMessageId: outbound.message.id,
          durationMs:
            turn.startedAt === undefined
              ? 0
              : Math.max(0, view.now - turn.startedAt),
        })
        await new TurnLifecycle(view, session).finish(turn, {
          state: 'failed',
          retryMessageId: outbound.message.id,
        })
        if (running)
          await view.saveCommand({
            type: 'interrupt',
            commandId: this.dependencies.randomId(),
            sessionId: session.id,
            turnId: turn.id,
          })
        return failed
      },
      this.publish,
    )
    if (!failed) return false
    await this.dependencies.runnerEventStored(
      failed,
      async (event, occurredAt) => {
        await this.store.change(
          workspaceId,
          (view) => view.emit(event, occurredAt),
          this.publish,
        )
      },
    )
    return true
  }
}
