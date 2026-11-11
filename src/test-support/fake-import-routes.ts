import {
  conductorOldDocumentPath,
  conductorOldDocumentsPath,
} from '../shared/conductor-import'
import type { MessageSender } from '../shared/messages'
import { sessionsPath, type Session } from '../shared/sessions'
import { workspaceViewPath } from '../shared/workspace-view'
import {
  workspacePath,
  workspacePaths,
  workspacesPath,
  type ActivateWorkspaceResponse,
  type OrderedWorkspaceResponse,
  type Workspace,
  type WorkspaceStart,
  type WorkspaceState,
} from '../shared/workspaces'
import type { FakeRouteWriter } from './fake-api-routes'
import { FAKE_IDS, FAKE_TIME, fakeUser } from './fixtures/core'
import {
  fakeImportOrigin,
  fakeOldDocuments,
  fakeOldMarkdown,
} from './fixtures/old-documents'
import { senderSnapshot, workspaceFixtures } from './fixtures/workspaces'

/**
 * The states of the imported fake workspace: before its activation, while
 * it runs, after a failed one, stopped before one succeeded, activated and
 * ready, and archived before an activation.
 */
export const FAKE_IMPORTS = [
  'inactive',
  'starting',
  'failed',
  'stopped',
  'ready',
  'archived',
] as const

export type FakeImport = (typeof FAKE_IMPORTS)[number]

const states: Readonly<
  Record<FakeImport, { state: WorkspaceState; activated: boolean }>
> = {
  inactive: { state: 'inactive', activated: false },
  starting: { state: 'starting', activated: false },
  failed: { state: 'error', activated: false },
  stopped: { state: 'stopped', activated: false },
  ready: { state: 'ready', activated: true },
  archived: { state: 'archived', activated: false },
}

/** The first step of an activation, as the Worker names it. */
function activationStart(failed: boolean): WorkspaceStart {
  return {
    kind: 'create',
    startedAt: FAKE_TIME - 3_000,
    steps: [
      {
        id: 'image',
        label: 'Starting from the newest image',
        state: failed ? 'failed' : 'running',
        startedAt: FAKE_TIME - 3_000,
        completedAt: failed ? FAKE_TIME : null,
      },
    ],
  }
}

/**
 * The early session of an activation, which the Worker stores before its
 * reply: Untitled, started by the member who activates, as its first new
 * session. The fakes stream it, as the Worker does.
 */
export function earlySessionOf(
  workspace: Workspace,
  starter: MessageSender,
  at: number,
): Session {
  return {
    id: `${workspace.id}-activation`,
    workspaceId: workspace.id,
    title: null,
    choice: workspace.choice,
    createdAt: at,
    closedAt: null,
    activeTurnId: null,
    activeTurnStartedAt: null,
    retryMessageId: null,
    startedBy: senderSnapshot(starter),
    sourceSessionId: null,
    loginAvailable: true,
    loginShared: true,
  }
}

/** The records of the imported fake workspace in one state. */
export function importedFixtures(imported: FakeImport) {
  const { state, activated } = states[imported]
  const fixtures = workspaceFixtures(state)
  const mark = (workspace: Workspace): Workspace =>
    workspace.id === FAKE_IDS.workspace
      ? { ...workspace, conductorImport: fakeImportOrigin(activated) }
      : workspace
  const workspaces = fixtures.workspaces.workspaces.map(mark)
  const workspace = mark(fixtures.detail.workspace)
  const detail: OrderedWorkspaceResponse = {
    eventNumber: 0,
    workspace,
    start:
      imported === 'starting' || imported === 'failed'
        ? activationStart(imported === 'failed')
        : null,
    error:
      imported === 'failed'
        ? {
            code: 'workspace_start_failed',
            message: 'The cloud computer did not start.',
            log: null,
          }
        : null,
  }
  const early = earlySessionOf(workspace, fakeUser, FAKE_TIME - 3_000)
  const activation: ActivateWorkspaceResponse = {
    workspace: { ...workspace, state: 'starting', updatedAt: FAKE_TIME },
    start: activationStart(false),
    error: null,
    sessionId: early.id,
  }
  // An activation that started keeps its early session, also after it
  // failed or stopped. Before an activation, no session exists.
  const started = imported !== 'inactive' && imported !== 'archived'
  const sessions = activated ? null : started ? [early] : []
  return { workspaces, detail, activation, activated, sessions }
}

/**
 * The routes of the imported fake workspace: its record in the list and
 * its read, Activate, the old documents with their Markdown, and before a
 * successful activation only the early session of an activation that
 * started, and an empty view. An Archive before an activation
 * keeps no cloud computer, so it offers no Restore.
 */
export function fakeImportRoutes(
  routes: FakeRouteWriter,
  imported: FakeImport,
): void {
  const org = FAKE_IDS.org
  const id = FAKE_IDS.workspace
  const { workspaces, detail, activation, activated, sessions } =
    importedFixtures(imported)
  routes.json('GET', workspacesPath(org), { workspaces })
  routes.json('GET', workspacePath(org, id), detail)
  routes.json('POST', workspacePaths.activate(org, id), activation)
  if (!activated) {
    routes.json('GET', sessionsPath(org, id), {
      eventNumber: 0,
      sessions: sessions ?? [],
      history: [],
    })
    routes.json('GET', workspaceViewPath(org, id), {
      view: { tabs: [], activeTab: null, fileList: 'all', tool: 'terminal' },
    })
    routes.json('POST', workspacePaths.archive(org, id), {
      workspace: {
        ...detail.workspace,
        state: 'archived',
        archivedAt: FAKE_TIME,
        restoreUntil: null,
        updatedAt: Math.max(FAKE_TIME, detail.workspace.updatedAt) + 1,
      },
      start: null,
      error: null,
    })
  }
  routes.json('GET', conductorOldDocumentsPath(org, id), {
    documents: fakeOldDocuments,
    nextCursor: null,
  })
  for (const document of fakeOldDocuments) {
    routes.response(
      'GET',
      conductorOldDocumentPath(org, id, document.id),
      new Response(fakeOldMarkdown(document), {
        headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
      }),
    )
  }
}
