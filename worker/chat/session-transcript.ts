import type {
  SessionTranscriptResponse,
  TranscriptDetail,
} from '../../src/shared/sessions'
import { SessionMarkdown } from '../../src/shared/transcript/session-markdown'
import { configuredModels } from '../app-api/models'
import { workspaceLink } from '../data/workspace-link'
import { readDeviceCommands } from '../devices/record-read'
import type { AppEnv } from '../env'
import { orgMembers } from '../members/member-data'
import type { BrowserAccess } from './browser-authorization'
import { invalidInput } from './inputs'
import { transcriptWorkspaceName } from './queries'
import { sessionFor } from './session-record'
import type { ChatStore } from './store'
import type { ChatStorage } from './types'

export async function sessionTranscript(
  request: Request,
  access: BrowserAccess,
  store: ChatStore,
  storage: ChatStorage,
  env: AppEnv,
): Promise<Response | null> {
  const match = access.suffix.match(/^\/sessions\/([^/]+)\/transcript$/)
  if (!match || request.method !== 'GET') return null
  let sessionId: string
  try {
    sessionId = decodeURIComponent(match[1])
  } catch {
    return invalidInput()
  }
  const detail = new URL(request.url).searchParams.get('detail')
  if (detail !== 'concise' && detail !== 'full') return invalidInput()
  return Response.json(
    await buildTranscript(sessionId, detail, access, store, storage, env),
  )
}

async function buildTranscript(
  sessionId: string,
  detail: TranscriptDetail,
  access: BrowserAccess,
  store: ChatStore,
  storage: ChatStorage,
  env: AppEnv,
): Promise<SessionTranscriptResponse> {
  const workspaceId = access.workspace.id
  const document = await store.run(() =>
    store.read(workspaceId, async (view) => {
      const session = await sessionFor(view, sessionId)
      const [name, members, commands, source] = await Promise.all([
        transcriptWorkspaceName(env.DB, workspaceId),
        orgMembers(env.DB, access.workspace.orgId),
        readDeviceCommands(storage),
        session.sourceSessionId
          ? view.session(session.sourceSessionId)
          : undefined,
      ])
      return {
        session,
        eventNumber: view.eventNumber,
        copiedAt: view.now,
        workspace: {
          number: access.presentation.number,
          name: name?.name ?? null,
          link: workspaceLink(
            access.presentation.origin,
            access.workspace.orgId,
            workspaceId,
          ),
        },
        models: configuredModels(env),
        members: members.map((member) => member.user),
        commands: commands.filter(
          (command) =>
            command.workspaceId === workspaceId &&
            command.sessionId === sessionId,
        ),
        ...(source ? { sourceTitle: source.title } : {}),
      }
    }),
  )
  const builder = new SessionMarkdown(document)
  let after = 0
  for (;;) {
    const page = await store.run(() =>
      store.read(workspaceId, (view) =>
        view.history(after, document.eventNumber, sessionId),
      ),
    )
    builder.merge(page.events)
    if (!page.hasMore) break
    after = page.nextAfterEventNumber
  }
  return { markdown: builder.render(detail) }
}
