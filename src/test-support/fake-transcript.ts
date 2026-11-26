import { createApiClient } from '../app/api/client'
import { readOrderedWorkspaceResponse } from '../app/api/read-workspaces'
import { createChatApi } from '../chat/api/client'
import { readSessions } from '../chat/api/read-responses'
import { sessionsPath } from '../shared/sessions'
import { SessionMarkdown } from '../shared/transcript/session-markdown'
import { workspacePath } from '../shared/workspaces'
import type { FakeApiServer } from './fake-api'
import { FAKE_IDS, FAKE_ORIGIN } from './fixtures/core'

const target = { orgId: FAKE_IDS.org, workspaceId: FAKE_IDS.workspace }

async function read<T>(
  server: FakeApiServer,
  path: string,
  reader: (value: unknown) => T,
): Promise<T> {
  const response = await server.fetch(path)
  return reader(await response.json())
}

/** The session and the detail of a transcript copy of the fake workspace. */
function copyOf(
  url: URL,
): { sessionId: string; detail: 'concise' | 'full' } | null {
  const prefix = `${sessionsPath(target.orgId, target.workspaceId)}/`
  const suffix = '/transcript'
  const detail = url.searchParams.get('detail')
  const { pathname } = url
  if (!pathname.startsWith(prefix) || !pathname.endsWith(suffix)) return null
  if (detail !== 'concise' && detail !== 'full') return null
  const id = pathname.slice(prefix.length, -suffix.length)
  return id.includes('/') ? null : { sessionId: decodeURIComponent(id), detail }
}

/**
 * The transcript copy of a session of the fake workspace, as the Worker
 * builds it: the real Markdown builder over the events of the fake stream,
 * which carry the labels that the Worker adds to each name, such as the
 * labels of a Continue note. Null for any other request, or for a session
 * that the fake does not list. Development only.
 */
export async function fakeTranscript(
  server: FakeApiServer,
  url: URL,
  now: () => number,
): Promise<Response | null> {
  const copy = copyOf(url)
  if (!copy) return null
  const { orgId, workspaceId } = target
  const listed = await read(
    server,
    sessionsPath(orgId, workspaceId),
    readSessions,
  )
  const session = [...listed.sessions, ...listed.history].find(
    (item) => item.id === copy.sessionId,
  )
  if (!session) return null
  const api = createChatApi(createApiClient(server.fetch), target)
  const [{ workspace }, models, members, org] = await Promise.all([
    read(
      server,
      workspacePath(orgId, workspaceId),
      readOrderedWorkspaceResponse,
    ),
    api.models(),
    api.members(),
    api.org(),
  ])
  const history = server.events.history()
  const builder = new SessionMarkdown({
    linkContext: { origin: FAKE_ORIGIN, orgId },
    orgName: org.name,
    session,
    eventNumber: history.throughEventNumber,
    workspace,
    copiedAt: now(),
    models,
    members,
    commands: [],
  })
  builder.merge(
    history.events.filter((envelope) => envelope.workspaceId === workspaceId),
  )
  return Response.json(
    { markdown: builder.render(copy.detail) },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
