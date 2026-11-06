import { chatHistoryPath } from '../../shared/events'
import { filePaths } from '../../shared/files'
import type { Attachment, UserMessage } from '../../shared/messages'
import { sessionsPath, type Session } from '../../shared/sessions'
import { workspaceViewPath } from '../../shared/workspace-view'
import { workspacePaths } from '../../shared/workspaces'
import { list, record, text } from '../api/json'
import { readAttachment, readChoice } from '../api/read-chat'
import type { DevBackend } from './dev-backend'
import { resume } from './dev-sandbox'

const reply = (body: unknown, status = 200) => Response.json(body, { status })

async function bodyOf(request: Request): Promise<Record<string, unknown>> {
  const value: unknown = await request.clone().json()
  return record(value)
}

/** Places a session among the tabs or in the history, and tells the tabs. */
export function place(backend: DevBackend, session: Session): void {
  const others = (items: Session[]) =>
    items.filter((item) => item.id !== session.id)
  if (session.closedAt === null) {
    backend.open = [...others(backend.open), session]
    backend.closed = others(backend.closed)
  } else {
    backend.open = others(backend.open)
    backend.closed = [session, ...others(backend.closed)]
  }
  backend.stream.emit({ type: 'session.updated', session })
  backend.sync()
}

function newSession(backend: DevBackend, choice: Session['choice']): Session {
  backend.count += 1
  const { orgId, workspaceId } = backend.target
  const session: Session = {
    id: `dev-session-${backend.count}`,
    workspaceId,
    title: 'New session',
    choice,
    createdAt: backend.clock.now(),
    closedAt: null,
    activeTurnId: null,
  }
  backend.server.json('GET', chatHistoryPath(orgId, workspaceId, session.id), {
    events: [],
    throughEventNumber: backend.stream.last,
  })
  place(backend, session)
  return session
}

const attachments = new Map<string, Attachment>()

async function send(backend: DevBackend, session: Session, request: Request) {
  const body = await bodyOf(request)
  const ready = ['ready', 'working', 'unread'].includes(backend.workspace.state)
  const message: UserMessage = {
    id: text(body.id),
    sessionId: session.id,
    sender: backend.workspace.owner,
    text: text(body.text),
    attachments: list(text)(body.attachmentIds).flatMap(
      (id) => attachments.get(id) ?? [],
    ),
    choice: readChoice(body.choice),
    createdAt: backend.clock.now(),
    state: ready ? 'sent' : 'queued',
  }
  backend.messages.set(message.id, message)
  const steered = backend.agent.steer(message)
  if (steered) return reply({ message, turnId: steered }, 202)
  backend.stream.emit({ type: 'message.accepted', message })
  const recorded = backend.recordedTurns.get(session.id)
  if (recorded) {
    backend.stream.emit({
      type: 'message.sent',
      sessionId: session.id,
      messageId: message.id,
      turnId: recorded,
    })
    return reply({ message, turnId: recorded }, 202)
  }
  if (!ready) {
    backend.queue.push(message)
    return reply({ message, turnId: null }, 202)
  }
  return reply(
    { message, turnId: backend.agent.start(session.id, [message]) },
    202,
  )
}

async function sessionWrite(
  backend: DevBackend,
  request: Request,
  session: Session,
  action: string,
  messageId: string | undefined,
): Promise<Response | null> {
  const { method } = request
  const running =
    backend.agent.running(session.id) ?? backend.recordedTurns.get(session.id)
  if (method === 'PATCH' && action === '') {
    const title = text((await bodyOf(request)).title)
    place(backend, { ...session, title })
    return reply({ session: { ...session, title } })
  }
  if (method === 'POST' && action === 'close') {
    if ((await bodyOf(request)).stopRunningTurn === true)
      stop(backend, session.id)
    const closed = {
      ...session,
      closedAt: backend.clock.now(),
      activeTurnId: null,
    }
    place(backend, closed)
    return reply({ session: closed })
  }
  if (method === 'POST' && action === 'reopen') {
    const reopened = { ...session, closedAt: null }
    place(backend, reopened)
    return reply({ session: reopened })
  }
  if (method === 'POST' && action === 'messages')
    return send(backend, session, request)
  if (method === 'POST' && action === 'interrupt' && running) {
    stop(backend, session.id)
    return reply({ turnId: running, state: 'stopping' })
  }
  if (method === 'POST' && action === 'retry' && messageId) {
    const message = backend.messages.get(messageId)
    if (!message) return null
    return reply(
      { message, turnId: backend.agent.start(session.id, [message]) },
      202,
    )
  }
  if (method === 'PUT' && action === 'model') {
    const body = await bodyOf(request)
    const choice = readChoice(body.choice)
    if (choice.agent === session.choice.agent) {
      place(backend, { ...session, choice })
      return reply({
        session: { ...session, choice },
        created: false,
        draft: body.draft,
      })
    }
    return reply({
      session: newSession(backend, choice),
      created: true,
      draft: body.draft,
    })
  }
  return null
}

/** Stop ends the scripted turn, or the recorded one, as stopped. */
function stop(backend: DevBackend, sessionId: string): void {
  const recorded = backend.recordedTurns.get(sessionId)
  backend.agent.interrupt(sessionId)
  if (!recorded) return
  backend.recordedTurns.delete(sessionId)
  backend.stream.emit({
    sessionId,
    turnId: recorded,
    type: 'turn.completed',
    state: 'stopped',
    durationMs: 161_000,
    files: [],
    userMessageIds: [],
  })
}

/**
 * The writes that the development page makes stateful. Each one changes the
 * fake's records, and sends the events that the backend would send.
 */
export async function handleWrite(
  backend: DevBackend,
  request: Request,
): Promise<Response | null> {
  const { orgId, workspaceId } = backend.target
  const path = new URL(request.url).pathname
  const { method } = request
  if (method === 'POST' && path === sessionsPath(orgId, workspaceId)) {
    return reply(
      {
        session: newSession(
          backend,
          readChoice((await bodyOf(request)).choice),
        ),
      },
      201,
    )
  }
  if (method === 'PUT' && path === workspaceViewPath(orgId, workspaceId)) {
    const view = await bodyOf(request)
    backend.server.json('GET', workspaceViewPath(orgId, workspaceId), { view })
    return reply({ view })
  }
  if (method === 'POST' && path === workspacePaths.resume(orgId, workspaceId)) {
    return reply(resume(backend))
  }
  if (method === 'POST' && path === filePaths.attachments(orgId, workspaceId)) {
    const body = await bodyOf(request)
    const attachment = readAttachment({
      ...body,
      id: `dev-file-${attachments.size + 1}`,
      sizeBytes: Math.floor((text(body.dataBase64).length * 3) / 4),
    })
    attachments.set(attachment.id, attachment)
    return reply({ attachment }, 201)
  }
  const prefix = `${sessionsPath(orgId, workspaceId)}/`
  if (!path.startsWith(prefix)) return null
  const [id = '', action = '', messageId, retry] = path
    .slice(prefix.length)
    .split('/')
    .map(decodeURIComponent)
  const session = [...backend.open, ...backend.closed].find(
    (item) => item.id === id,
  )
  if (!session) return null
  return sessionWrite(backend, request, session, retry ?? action, messageId)
}
