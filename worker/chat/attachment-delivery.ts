import type { WorkspaceEventEnvelope } from './workspace-events'
import { HttpError } from '../http'
import { captureUnexpectedWorkerFailure } from '../error-reporting/policy'
import { attachmentCopyKey } from './attachment-record'
import { commandDispatchState, type DispatchState } from './ordered-dispatch'
import type { ChatStore } from './store'
import { TurnCompletion } from './turn-completion'
import type {
  ActiveRunner,
  ChatDependencies,
  PendingCommand,
  PreparedMessageCommand,
} from './types'

type MessageCommand = PreparedMessageCommand
interface Preparation {
  runner: ActiveRunner
  isCurrent: () => boolean
  ready: boolean
  sandboxId: string | null
}

/** Each message and destination owns one copy, independently of its commands and connections. */
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
    const sandboxId = await this.dependencies.attachmentSandboxId(
      active.workspace.id,
      command.message.sender.id,
    )
    const key = await attachmentCopyKey(command.message.id, sandboxId)
    const previous = this.pending.get(key)
    if (previous) {
      previous.runner = active
      previous.isCurrent = isCurrent
      return previous.ready ? 'send' : 'wait'
    }
    // An old absolute-path command has no proof for the repository destination.
    if (
      command.attachments.every(
        (attachment) => typeof attachment.relativePath === 'string',
      ) &&
      sandboxId !== null &&
      (await this.store.read(active.workspace.id, (view) =>
        view.attachmentCopy(command.message.id, sandboxId),
      ))
    )
      return 'send'
    const preparation: Preparation = {
      runner: active,
      isCurrent,
      ready: false,
      sandboxId,
    }
    this.pending.set(key, preparation)
    const start = () =>
      Promise.resolve()
        .then(() =>
          this.dependencies.prepareAttachments(
            active.workspace.id,
            command.message.sender.id,
            command.message.id,
            command.attachments,
            sandboxId,
          ),
        )
        .then(
          () =>
            this.store.run(async () => {
              if (this.pending.get(key) !== preparation) return
              if (sandboxId !== null)
                await this.store.change(
                  active.workspace.id,
                  (view) =>
                    view.saveAttachmentCopy(command.message.id, sandboxId),
                  this.publish,
                )
              preparation.ready = true
              await this.resume()
            }),
          (error: unknown) =>
            this.store.run(async () => {
              if (this.pending.get(key) !== preparation) return
              captureUnexpectedWorkerFailure('attachment_copy_failed', error)
              this.pending.delete(key)
              const current = await this.currentCommand(preparation, command)
              if (current)
                await this.failTurn(active.workspace.id, current, error)
              await this.resume()
            }),
        )
    const work = this.dependencies.reporting?.callback(start) ?? start()
    this.dependencies.waitUntil(
      work.catch((error: unknown) => {
        if (this.pending.get(key) === preparation) this.pending.delete(key)
        try {
          preparation.runner.peer.close()
        } catch {
          /* The connection already closed. */
        }
        throw error
      }),
    )
    return 'wait'
  }

  private async currentCommand(
    preparation: Preparation,
    original: MessageCommand,
  ): Promise<Extract<PendingCommand, { messageId: string }> | undefined> {
    const { runner, isCurrent, sandboxId } = preparation
    if (
      !isCurrent() ||
      sandboxId !==
        (await this.dependencies.attachmentSandboxId(
          runner.workspace.id,
          original.message.sender.id,
        ))
    )
      return undefined
    return this.store.read(runner.workspace.id, async (view) => {
      for (const command of await view.pending())
        if (
          (command.type === 'turn' || command.type === 'message') &&
          command.messageId === original.message.id &&
          !(await view.commandDelivered(command.commandId, runner.id)) &&
          (await commandDispatchState(view, command)) === 'send'
        )
          return command
      return undefined
    })
  }

  private async failTurn(
    workspaceId: string,
    outbound: Extract<PendingCommand, { messageId: string }>,
    error: unknown,
  ): Promise<void> {
    await this.store.change(
      workspaceId,
      async (view) => {
        const turn = await view.turn(outbound.turnId)
        if (!turn || (turn.state !== 'queued' && turn.state !== 'running'))
          return
        const session = await view.session(outbound.sessionId)
        if (!session || session.activeTurnId !== turn.id) return
        const running = turn.state === 'running'
        await view.emit({
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
          retryMessageId: outbound.messageId,
          durationMs:
            turn.startedAt === undefined
              ? 0
              : Math.max(0, view.now - turn.startedAt),
        })
        await new TurnCompletion(view, session).finish(turn, {
          state: 'failed',
          retryMessageId: outbound.messageId,
        })
        if (running)
          await view.saveCommand({
            type: 'interrupt',
            commandId: this.dependencies.randomId(),
            sessionId: session.id,
            turnId: turn.id,
          })
      },
      this.publish,
    )
  }
}
