import { chatHistoryPath } from '../shared/events'
import { workspaceOwnerPath } from '../shared/members'
import {
  retryMessagePath,
  sessionPath,
  sessionPaths,
  sessionsPath,
} from '../shared/sessions'
import { workspaceViewPath } from '../shared/workspace-view'
import {
  workspacePath,
  workspacePaths,
  workspacesPath,
  type WorkspaceState,
} from '../shared/workspaces'
import type { FakeRouteWriter } from './fake-api-routes'
import { FAKE_IDS } from './fixtures/core'
import { workspaceFixtures } from './fixtures/workspaces'
import { recordedChatEvents, type RecordedChatScenario } from './recorded-chat'

export function fakeWorkspaceRoutes(
  routes: FakeRouteWriter,
  state: WorkspaceState,
  conversation: RecordedChatScenario,
) {
  const data = workspaceFixtures(state)
  const org = FAKE_IDS.org
  routes.json('GET', workspacesPath(org), data.workspaces)
  routes.json('POST', workspacesPath(org), data.created, 201)
  for (const workspace of [
    ...data.workspaces.workspaces,
    data.created.workspace,
  ]) {
    const id = workspace.id
    const detail =
      workspace.id === data.created.workspace.id
        ? data.created
        : { ...data.detail, workspace }
    const sessions = {
      sessions: data.sessions.sessions.map((session) => ({
        ...session,
        workspaceId: id,
      })),
      history: data.sessions.history.map((session) => ({
        ...session,
        workspaceId: id,
      })),
    }
    if (workspace.id === data.created.workspace.id) {
      sessions.sessions = [
        {
          ...sessions.sessions[0],
          id: data.created.sessionId,
          title: 'New session',
        },
      ]
      sessions.history = []
    }
    routes.json('GET', workspacePath(org, id), detail)
    routes.json('PATCH', workspacePath(org, id), detail)
    routes.json('POST', workspacePaths.open(org, id), detail)
    routes.json('POST', workspacePaths.resume(org, id), detail)
    routes.empty('POST', workspacePaths.activity(org, id))
    routes.empty('PUT', workspacePaths.read(org, id))
    routes.json('GET', workspacePaths.archiveCheck(org, id), {
      uncommittedFiles: ['src/app/checkout/AddressForm.tsx'],
      unpushedCommits: 1,
    })
    routes.json('POST', workspacePaths.archive(org, id), {
      ...detail,
      workspace: {
        ...workspace,
        state: 'archived',
        archivedAt: workspace.updatedAt,
      },
      start: null,
      error: null,
    })
    routes.json('PUT', workspaceOwnerPath(org, id), { workspace })
    routes.json('GET', workspaceViewPath(org, id), data.view)
    routes.json('PUT', workspaceViewPath(org, id), data.view)
    routes.json('GET', sessionsPath(org, id), sessions)
    routes.json(
      'POST',
      sessionsPath(org, id),
      { session: sessions.sessions[0] },
      201,
    )
    for (const session of [...sessions.sessions, ...sessions.history]) {
      const message = { ...data.message, sessionId: session.id }
      routes.json('PATCH', sessionPath(org, id, session.id), { session })
      routes.json('POST', sessionPaths.close(org, id, session.id), { session })
      routes.json('POST', sessionPaths.reopen(org, id, session.id), { session })
      routes.json('PUT', sessionPaths.model(org, id, session.id), {
        session,
        created: false,
        draft: { text: '', attachmentIds: [] },
      })
      routes.json(
        'POST',
        sessionPaths.messages(org, id, session.id),
        { message, turnId: 'turn-1' },
        202,
      )
      routes.json(
        'POST',
        retryMessagePath(org, id, session.id, data.message.id),
        { message, turnId: 'turn-1' },
        202,
      )
      routes.json('POST', sessionPaths.interrupt(org, id, session.id), {
        turnId: 'turn-1',
        state: 'stopping',
      })
      const events = recordedChatEvents(conversation, id, session.id)
      routes.json('GET', chatHistoryPath(org, id, session.id), {
        events,
        throughEventNumber: events.at(-1)?.eventNumber ?? 0,
      })
    }
  }
}
