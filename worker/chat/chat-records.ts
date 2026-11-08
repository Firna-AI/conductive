import type { UserMessage } from '../../src/shared/messages'
import type { Session } from '../../src/shared/sessions'
import { normalizeSession, type StoredSession } from './session-storage'
import { CHAT_ROOT, chatKey } from './storage-keys'
import type { ChatData, ModelSessionCreation, StoredTurn } from './types'

const FIRST_SESSION_KEY = `${CHAT_ROOT}first-session`

interface FirstSessionName {
  id: string
  messageId?: string
  workspaceName: string
  titleReceived: boolean
}

export class ChatRecords {
  protected readonly data: ChatData

  constructor(data: ChatData) {
    this.data = data
  }

  firstSession(): Promise<FirstSessionName | undefined> {
    return this.data.get(FIRST_SESSION_KEY)
  }
  saveFirstSession(session: FirstSessionName): Promise<void> {
    return this.data.put(FIRST_SESSION_KEY, session)
  }

  async session(id: string): Promise<Session | undefined> {
    const stored = await this.data.get<StoredSession>(chatKey('session', id))
    if (!stored) return undefined
    const session = normalizeSession(stored)
    const active = session.activeTurnId
      ? await this.turn(session.activeTurnId)
      : undefined
    session.activeTurnStartedAt = active?.startedAt ?? null
    return session
  }

  message(id: string): Promise<UserMessage | undefined> {
    return this.data.get(chatKey('message', id))
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
    return this.data.put(chatKey('message', message.id), message)
  }
  messageSource(messageId: string): Promise<string | undefined> {
    return this.data.get(chatKey('message-source', messageId))
  }
  saveMessageSource(messageId: string, sessionId: string): Promise<void> {
    return this.data.put(chatKey('message-source', messageId), sessionId)
  }
}
