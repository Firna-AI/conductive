import type { GitHubSummary } from '../shared/generated/GitHubSummary'
import type { WorkspaceState } from '../shared/generated/WorkspaceState'
import type { PathState } from '../../docs/mockups/src/fixtures/maskedFiles'
import { workspaceAfterEvent } from '../app/workspace-detail'
import { chatHistoryPath } from '../shared/events'

import { workspaceOwnerPath } from '../shared/members'
import {
  secretRequestsPath,
  type SecretRequestsResponse,
} from '../shared/secret-requests'
import {
  workspaceCapabilitiesPath,
  type WorkspaceCapabilitiesResponse,
} from '../shared/secrets'
import {
  retryMessagePath,
  sessionPath,
  sessionPaths,
  sessionsPath,
} from '../shared/sessions'
import { workspaceViewPath } from '../shared/workspace-view'
import {
  WORKSPACE_RESTORE_MS,
  workspacePath,
  workspacePaths,
  workspacesPath,
  type OrderedWorkspaceResponse,
  type WorkspaceResponse,
} from '../shared/workspaces'
import type { FakeRouteWriter } from './fake-api-routes'
import type { FakeWorkspaceEvents } from './fake-events'
import { FAKE_IDS, FAKE_TIME } from './fixtures/core'
import { withSubWorkspaces } from './fixtures/sub-workspaces'
import { workspaceFixtures } from './fixtures/workspaces'
import {
  maskedChangedFiles,
  withMaskedTurnFiles,
} from './fixtures/masked-paths'
import { recordedChatEvents, type RecordedChatScenario } from './recorded-chat'

/**
 * The recorded chats whose turn still runs at their end. Each session record
 * names that turn and its start, as the Worker does.
 */
const runningAtEnd: ReadonlySet<RecordedChatScenario> = new Set([
  'running',
  'first-turn',
  'refused-events',
])

/**
 * The event number of each recorded session reply. The recorded session
 * state holds before the events that a test sends.
 */
const eventNumber = 0

function recordedDetail(
  detail: WorkspaceResponse,
  events: FakeWorkspaceEvents,
): WorkspaceResponse {
  const history = events.history(0, detail.workspace.id)
  return history.events.reduce((current, { event }) => {
    switch (event.type) {
      case 'workspace.updated':
      case 'workspace.title':
      case 'start.updated':
        return workspaceAfterEvent(current, event)
      default:
        return current
    }
  }, detail)
}

export function fakeWorkspaceRoutes(
  routes: FakeRouteWriter,
  state: WorkspaceState,
  conversation: RecordedChatScenario | undefined,
  paths: PathState = 'plain',
  /** The GitHub state of the default workspace, as `workspaceFixtures` takes it. */
  github?: GitHubSummary | null,
  workspaceStates?: ReadonlyMap<string, WorkspaceState>,
  /** The list has the sub-workspaces of the mockups too. */
  subWorkspaces = false,
  events?: FakeWorkspaceEvents,
) {
  const data = workspaceFixtures(state, github)
  const org = FAKE_IDS.org
  // The list keeps the removed workspace of the fixtures, as the Worker
  // does, so that its links still resolve. The app leaves it out of its
  // groups.
  const listed = subWorkspaces
    ? withSubWorkspaces(data.workspaces.workspaces)
    : data.workspaces.workspaces
  routes.json('GET', workspacesPath(org), { workspaces: listed })
  routes.json('POST', workspacesPath(org), data.created, 201)
  for (const workspace of [...listed, data.created.workspace]) {
    const id = workspace.id
    const detail =
      workspace.id === data.created.workspace.id
        ? data.created
        : { ...data.detail, workspace }
    const workspaceState = workspaceStates?.get(id) ?? workspace.state
    const scenario =
      conversation ?? (workspaceState === 'working' ? 'running' : 'history')
    const running = runningAtEnd.has(scenario)
    const sessions = {
      eventNumber,
      sessions: data.sessions.sessions.map((session) => ({
        ...session,
        workspaceId: id,
        activeTurnId: running ? 'turn-1' : null,
        activeTurnStartedAt: running ? FAKE_TIME : null,
        retryMessageId: scenario === 'failed' ? data.message.id : null,
      })),
      history: data.sessions.history.map((session) => ({
        ...session,
        workspaceId: id,
      })),
    }
    if (workspace.id === data.created.workspace.id) {
      // The first session of a new workspace has no title until the title of
      // the workspace comes.
      sessions.sessions = [
        {
          ...sessions.sessions[0],
          id: data.created.sessionId,
          title: null,
          activeTurnId: null,
          activeTurnStartedAt: null,
          retryMessageId: null,
        },
      ]
      sessions.history = []
    }
    // A read and a Resume carry the order of their state. A create, a
    // rename, and an Archive do not.
    const reply = {
      workspace: detail.workspace,
      start: detail.start,
      error: detail.error,
    }
    const ordered = (seed: boolean): OrderedWorkspaceResponse => {
      if (!events) return { ...reply, eventNumber }
      const current = recordedDetail(reply, events)
      return seed
        ? { ...current, ...events.stateRead(id) }
        : { ...current, eventNumber: events.last(id) }
    }
    routes.handle('GET', workspacePath(org, id), async () =>
      Response.json(ordered(true)),
    )
    routes.json('PATCH', workspacePath(org, id), reply)
    routes.handle('POST', workspacePaths.resume(org, id), async () =>
      Response.json(ordered(false)),
    )
    routes.json('POST', workspacePaths.restart(org, id), { updateCheck: 'ok' })
    routes.empty('POST', workspacePaths.activity(org, id))
    routes.empty('PUT', workspacePaths.read(org, id))
    // Archive keeps the cloud computer for the days of Restore. Archive and
    // Restore raise the time of the record past the time of each record
    // before them, as the Worker does, so the app orders each one after the
    // state before it, and a Restore after the Archive.
    const changedAt = Math.max(FAKE_TIME, workspace.updatedAt)
    routes.json('POST', workspacePaths.archive(org, id), {
      workspace: {
        ...workspace,
        state: 'archived',
        archivedAt: FAKE_TIME,
        restoreUntil: FAKE_TIME + WORKSPACE_RESTORE_MS,
        updatedAt: changedAt + 1,
      },
      start: null,
      error: null,
    })
    routes.json('POST', workspacePaths.restore(org, id), {
      workspace: {
        ...workspace,
        state: 'stopped',
        archivedAt: null,
        restoreUntil: null,
        updatedAt: changedAt + 2,
      },
      start: null,
      error: null,
    })
    routes.json('PUT', workspaceOwnerPath(org, id), { workspace })
    routes.json('GET', workspaceViewPath(org, id), data.view)
    routes.json('PUT', workspaceViewPath(org, id), data.view)
    routes.json('GET', sessionsPath(org, id), sessions)
    routes.json('GET', secretRequestsPath(org, id), {
      requests: [],
      workspaceValues: [],
    } satisfies SecretRequestsResponse)
    routes.json('GET', workspaceCapabilitiesPath(org, id), {
      capabilities: {
        preapprovedSecretIds: [],
        macAccess: true,
        sessionApprovals: [],
      },
    } satisfies WorkspaceCapabilitiesResponse)
    routes.json(
      'POST',
      sessionsPath(org, id),
      { session: sessions.sessions[0], eventNumber },
      201,
    )
    for (const session of [...sessions.sessions, ...sessions.history]) {
      const message = { ...data.message, sessionId: session.id }
      const reply = { session, eventNumber }
      routes.json('PATCH', sessionPath(org, id, session.id), reply)
      routes.json('POST', sessionPaths.close(org, id, session.id), reply)
      routes.json('POST', sessionPaths.reopen(org, id, session.id), reply)
      routes.json('PUT', sessionPaths.model(org, id, session.id), {
        ...reply,
        created: false,
        draft: { text: '', attachmentIds: [] },
      })
      // A reply names the session where the message went: here its own.
      routes.json(
        'POST',
        sessionPaths.messages(org, id, session.id),
        { message, turnId: 'turn-1', ...reply },
        202,
      )
      routes.json(
        'POST',
        retryMessagePath(org, id, session.id, data.message.id),
        { message, turnId: 'turn-1', ...reply },
        202,
      )
      routes.json('POST', sessionPaths.interrupt(org, id, session.id), {
        turnId: 'turn-1',
        state: 'stopping',
        eventNumber,
      })
      const recorded = recordedChatEvents(scenario, id, session.id)
      const events =
        paths === 'masked'
          ? withMaskedTurnFiles(recorded, maskedChangedFiles())
          : recorded
      routes.json('GET', chatHistoryPath(org, id, session.id), {
        events,
        throughEventNumber: events.at(-1)?.eventNumber ?? 0,
      })
    }
  }
}
