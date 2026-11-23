import type { Session } from '../../src/shared/generated/Session'
import type { UserMessage } from '../../src/shared/generated/UserMessage'

import { attachmentCopyKey } from './attachment-record'
import { normalizeSession, type StoredSession } from './session-storage'
import { CHAT_ROOT, chatKey } from './storage-keys'
import type { ChatData, ModelSessionCreation, StoredTurn } from './types'
import type { PendingCommand } from './pending-command'
import type { ToolSessionRequest } from './tool-session-requests'
import { QueueFixRecords } from './queue-fix-records'

const FIRST_SESSION_KEY = `${CHAT_ROOT}first-session`

interface FirstSession {
  id: string
  messageId?: string
}

export class ChatRecords {
  protected readonly data: ChatData
  readonly queueFixes: QueueFixRecords

  constructor(data: ChatData) {
    this.data = data
    this.queueFixes = new QueueFixRecords(data)
  }

  async cursor(streamId: string): Promise<number> {
    return (await this.data.get<number>(chatKey('cursor', streamId))) ?? 0
  }
  async streamReady(streamId: string): Promise<boolean> {
    return (await this.data.get<boolean>(chatKey('ready', streamId))) ?? false
  }
  saveStreamReady(streamId: string): Promise<void> {
    return this.data.put(chatKey('ready', streamId), true)
  }
  saveCursor(streamId: string, through: number): Promise<void> {
    return this.data.put(chatKey('cursor', streamId), through)
  }
  async command(commandId: string): Promise<PendingCommand | undefined> {
    return (
      await this.data.get<{ command: PendingCommand }>(
        chatKey('command', commandId),
      )
    )?.command
  }
  async commandDelivered(
    commandId: string,
    connectionId: string,
  ): Promise<boolean> {
    return (
      (
        await this.data.get<{ deliveredTo?: string }>(
          chatKey('command', commandId),
        )
      )?.deliveredTo === connectionId
    )
  }
  async saveCommandDelivery(
    commandId: string,
    connectionId: string,
  ): Promise<void> {
    const record = await this.data.get<{
      command: PendingCommand
      order: number
      deliveredTo?: string
    }>(chatKey('command', commandId))
    if (record)
      await this.data.put(chatKey('command', commandId), {
        ...record,
        deliveredTo: connectionId,
      })
  }
  async removeCommand(commandId: string): Promise<void> {
    await this.data.delete(chatKey('command', commandId))
  }

  async pending(): Promise<PendingCommand[]> {
    const records = [
      ...(
        await this.data.list<{ command: PendingCommand; order: number }>({
          prefix: `${CHAT_ROOT}command:`,
        })
      ).values(),
    ]
    return records
      .sort((left, right) => left.order - right.order)
      .map((entry) => entry.command)
  }

  async oldestWaitingMessageAt(): Promise<number | undefined> {
    let oldest: number | undefined
    for (const command of await this.pending()) {
      if (command.type !== 'turn' && command.type !== 'message') continue
      const message = await this.message(command.messageId)
      if (message?.state === 'queued')
        oldest = Math.min(oldest ?? Infinity, message.createdAt)
    }
    return oldest
  }

  firstSession(): Promise<FirstSession | undefined> {
    return this.data.get(FIRST_SESSION_KEY)
  }
  toolSessionRequest(id: string): Promise<ToolSessionRequest | undefined> {
    return this.data.get(chatKey('tool-session-request', id))
  }
  saveToolSessionRequest(
    id: string,
    request: ToolSessionRequest,
  ): Promise<void> {
    return this.data.put(chatKey('tool-session-request', id), request)
  }
  saveFirstSession(session: FirstSession): Promise<void> {
    return this.data.put(FIRST_SESSION_KEY, session)
  }

  async session(id: string): Promise<Session | undefined> {
    const stored = await this.data.get<StoredSession>(chatKey('session', id))
    if (!stored) return undefined
    const session = normalizeSession(
      stored,
      (await this.newestTurn(id)) !== undefined,
    )
    const active = session.activeTurnId
      ? await this.turn(session.activeTurnId)
      : undefined
    session.activeTurnStartedAt = active?.startedAt ?? null
    return session
  }

  async message(id: string): Promise<UserMessage | undefined> {
    const message = await this.data.get<UserMessage>(chatKey('message', id))
    return message
      ? {
          ...message,
          choice: { ...message.choice, fast: message.choice.fast ?? false },
        }
      : undefined
  }
  turn(id: string): Promise<StoredTurn | undefined> {
    return this.data.get(chatKey('turn', id))
  }
  messageTurn(id: string): Promise<string | undefined> {
    return this.data.get(chatKey('message-turn', id))
  }
  newestTurn(sessionId: string): Promise<string | undefined> {
    return this.data.get(chatKey('newest-turn', sessionId))
  }
  async sessions(): Promise<Session[]> {
    const records = await this.data.list<StoredSession>({
      prefix: `${CHAT_ROOT}session:`,
    })
    const sessions: Session[] = []
    for (const stored of records.values()) {
      const session = await this.session(stored.id)
      if (session) sessions.push(session)
    }
    return sessions
  }
  async turns(): Promise<StoredTurn[]> {
    return [
      ...(
        await this.data.list<StoredTurn>({ prefix: `${CHAT_ROOT}turn:` })
      ).values(),
    ]
  }
  async saveSession(session: Session): Promise<void> {
    const active = session.activeTurnId
      ? await this.turn(session.activeTurnId)
      : undefined
    session.activeTurnStartedAt = active?.startedAt ?? null
    await this.data.put(chatKey('session', session.id), session)
  }
  modelSessionCreation(id: string): Promise<ModelSessionCreation | undefined> {
    return this.data.get(chatKey('model-session', id))
  }
  saveModelSessionCreation(
    id: string,
    creation: ModelSessionCreation,
  ): Promise<void> {
    return this.data.put(chatKey('model-session', id), creation)
  }
  saveMessage(message: UserMessage): Promise<void> {
    return this.saveMessageWithAttachments(message)
  }
  private async saveMessageWithAttachments(
    message: UserMessage,
  ): Promise<void> {
    await this.data.put(chatKey('message', message.id), message)
    for (const attachment of message.attachments)
      await this.data.put(chatKey('attachment-use', attachment.id), {
        messageId: message.id,
        userId: message.sender.id,
      })
  }
  attachmentUse(
    id: string,
  ): Promise<{ messageId: string; userId: string } | undefined> {
    return this.data.get(chatKey('attachment-use', id))
  }
  async usedAttachments(
    ids: readonly string[],
    userId: string,
  ): Promise<string[]> {
    const used: string[] = []
    for (const id of ids)
      if ((await this.attachmentUse(id))?.userId === userId) used.push(id)
    return used
  }
  async attachmentCopy(messageId: string, sandboxId: string): Promise<boolean> {
    return (
      (await this.data.get<boolean>(
        chatKey(
          'attachment-copy',
          await attachmentCopyKey(messageId, sandboxId),
        ),
      )) === true
    )
  }
  async saveAttachmentCopy(
    messageId: string,
    sandboxId: string,
  ): Promise<void> {
    await this.data.put(
      chatKey('attachment-copy', await attachmentCopyKey(messageId, sandboxId)),
      true,
    )
  }
  messageSource(messageId: string): Promise<string | undefined> {
    return this.data.get(chatKey('message-source', messageId))
  }
  saveMessageSource(messageId: string, sessionId: string): Promise<void> {
    return this.data.put(chatKey('message-source', messageId), sessionId)
  }
}
