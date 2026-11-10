import { chatHistoryPath } from '../../shared/events'
import { sessionsPath } from '../../shared/sessions'
import { SessionMarkdown } from '../../shared/transcript/session-markdown'
import { createChatApi } from '../api/client'
import { readStoredEvents } from '../api/read-workspace'
import type { DevBackend } from './dev-backend'
import { recordOf } from './dev-sessions'

/** The development route builds real Markdown from recorded and live events. */
export async function handleTranscript(
  backend: DevBackend,
  request: Request,
): Promise<Response | null> {
  const url = new URL(request.url)
  const { orgId, workspaceId } = backend.target
  const prefix = `${sessionsPath(orgId, workspaceId)}/`
  if (request.method !== 'GET' || !url.pathname.startsWith(prefix)) return null
  const suffix = url.pathname.slice(prefix.length).split('/')
  if (suffix.length !== 2 || suffix[1] !== 'transcript') return null
  const detail = url.searchParams.get('detail')
  if (detail !== 'concise' && detail !== 'full') {
    return Response.json(
      {
        error: {
          code: 'invalid_input',
          message: 'Choose a transcript detail.',
        },
      },
      { status: 400 },
    )
  }
  const session = recordOf(backend, decodeURIComponent(suffix[0]))
  if (!session) {
    return Response.json(
      {
        error: {
          code: 'session_not_found',
          message: 'The session is not available.',
        },
      },
      { status: 404 },
    )
  }
  const stream = backend.stream.history()
  const workspace = backend.workspace
  const copiedAt = backend.clock.now()
  const commands = structuredClone(backend.mac.requests)
  const source = session.sourceSessionId
    ? recordOf(backend, session.sourceSessionId)
    : undefined
  const api = createChatApi(backend.client, backend.target)
  const [stored, models, members] = await Promise.all([
    backend.server
      .fetch(chatHistoryPath(orgId, workspaceId, session.id))
      .then(async (response) => readStoredEvents(await response.json())),
    api.models(),
    api.members(),
  ])
  const builder = new SessionMarkdown({
    session,
    eventNumber: Math.max(stream.throughEventNumber, stored.throughEventNumber),
    workspace,
    copiedAt,
    models,
    members,
    commands,
    ...(source ? { sourceTitle: source.title } : {}),
  })
  builder.merge(stored.envelopes)
  builder.merge(stream.events)
  return Response.json(
    { markdown: builder.render(detail) },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
