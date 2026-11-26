import type { MessageSender } from '../shared/generated/MessageSender'
import type { Session } from '../shared/generated/Session'
import type { Workspace } from '../shared/generated/Workspace'
import { repositoryFailure } from '../ui/components/workspace/repositoryMoveCopy'
import { movedBranch } from '../../docs/mockups/src/fixtures/repositoryMove'
import type { FetchLike } from '../app/api/client'
import { readOrderedWorkspaceResponse } from '../app/api/read-workspaces'
import { readSessions } from '../chat/api/read-responses'
import type { WorkspaceEvent } from '../shared/events'
import { filePaths } from '../shared/files'
import { githubPaths } from '../shared/github'
import { sessionsPath } from '../shared/sessions'
import { workspaceViewPath } from '../shared/workspace-view'
import { workspacePath, workspacePaths } from '../shared/workspaces'
import type { FakeApiServer } from './fake-api'
import { bodyOf, read } from './fake-bar-dev'
import type { FakeBranches } from './fake-branch-names'
import {
  MOVED_REPOSITORY,
  newBranchGitHub,
  questionWith,
  repositoryNamesWith,
  type RepositoryNames,
} from './fake-repository-names'
import { FAKE_IDS, FAKE_ORIGIN } from './fixtures/core'
import { workspaceFixtures } from './fixtures/workspaces'
import { nextEnvelope } from './recorded-repairs'

/*
 * The replies and events of a repository change of the fake workspace, for
 * tests and the development page. Each one follows the contracts of the
 * Worker.
 */

const org = FAKE_IDS.org
const id = FAKE_IDS.workspace

/** The repository change job of the fake workspace. */
export const CHANGE_ID = `repository-change-${id}`

/** The new branch in the folder of the new repository. */
export const MOVED_BRANCH = movedBranch

/** How a repository change of the fake ends. */
export type FakeRepositoryEnd =
  'changed' | 'question' | 'clash' | 'outdated' | 'fetch-failed'

/** The view of the fake workspace with the repositories that it holds. */
export function serveHeld(
  server: FakeApiServer,
  held: readonly string[] | null,
): void {
  const { view } = workspaceFixtures()
  server.json('GET', workspaceViewPath(org, id), {
    ...view,
    heldRepositoryIds: held,
  })
}

/** The safe words of the Worker for a default branch that it could not fetch. */
function fetchWords(base: string, repository: string): string {
  return `The latest ${base} of ${repository} could not be fetched. Check your GitHub access, then try again.`
}

/**
 * The replies of a change start and its poll, with the names of
 * `branches`, as `repositoryNamesWith` says. A `changed` poll needs the
 * event number of the published events, so `changedReply` gives it.
 */
export function serveRepositoryChange(
  server: FakeApiServer,
  end: FakeRepositoryEnd,
  branches: FakeBranches = 'plain',
): void {
  const start = workspacePaths.repository(org, id)
  const poll = workspacePaths.repositoryResult(org, id, CHANGE_ID)
  if (end === 'outdated') {
    const error = {
      code: 'workspace_software_outdated',
      message: 'Restart the software, then try again.',
    }
    server.json('POST', start, { error }, 409)
    return
  }
  server.json('POST', start, { state: 'pending', changeId: CHANGE_ID }, 202)
  if (end === 'question') server.json('GET', poll, questionWith(branches))
  const failed = (message: string) => {
    const error = { code: 'workspace_repository_change_failed', message }
    server.json('GET', poll, { error }, 409)
  }
  if (end === 'clash')
    failed(repositoryFailure.clash(MOVED_REPOSITORY.fullName))
  if (end === 'fetch-failed') {
    // The Worker masks each secret value in the words of a failure.
    const names = repositoryNamesWith(branches)
    const base = names.displayBaseBranch ?? names.baseBranch
    failed(fetchWords(base, MOVED_REPOSITORY.fullName))
  }
}

/** Sets the `changed` reply of the poll, at the event number of its events. */
export function changedReply(
  server: FakeApiServer,
  workspace: Workspace,
  eventNumber: number,
): void {
  const poll = workspacePaths.repositoryResult(org, id, CHANGE_ID)
  server.json('GET', poll, { state: 'changed', workspace, eventNumber })
}

/** The record of the workspace after the change, on the new `branch`. */
export function movedWorkspace(
  workspace: Workspace,
  branch: string = MOVED_BRANCH,
): Workspace {
  return {
    ...workspace,
    repositoryId: MOVED_REPOSITORY.id,
    branch,
    github: null,
  }
}

/**
 * The events of a repository change, as the Worker publishes them in one
 * chat transaction: the workspace in the new repository, and one note for
 * each session. The notes carry the labels of `names`, as the Worker sends
 * them to a browser.
 */
export function repositoryChangedEvents(
  workspace: Workspace,
  sessions: readonly Session[],
  member: MessageSender,
  names: RepositoryNames = repositoryNamesWith('plain'),
): WorkspaceEvent[] {
  return [
    {
      type: 'workspace.updated',
      workspace: movedWorkspace(workspace, names.branch),
    },
    ...sessions.map((session): WorkspaceEvent => ({
      type: 'workspace.repository-changed',
      sessionId: session.id,
      member,
      repository: MOVED_REPOSITORY,
      ...names,
    })),
  ]
}

/**
 * A fetch over the fake server that answers a repository change as the
 * Worker does, with the names of `branches`. A change that ends publishes
 * the workspace in the new repository, a note in each session, the empty
 * changes report of the new branch, and then its GitHub state, as
 * `newBranchGitHub` says. With `masked-repository`, New session opens a
 * session without messages. Every other request goes to `next`.
 * Development only.
 */
export function repositoryFetch(
  server: FakeApiServer,
  end: FakeRepositoryEnd,
  member: MessageSender,
  now: () => number,
  next: FetchLike,
  branches: FakeBranches = 'plain',
): FetchLike {
  serveRepositoryChange(server, end, branches)
  const names = repositoryNamesWith(branches)
  let publishes = end === 'changed'
  const emit = (event: WorkspaceEvent) =>
    server.events.emit(nextEnvelope(server.events, event, now()))
  const publish = async () => {
    const detail = await read(
      server,
      workspacePath(org, id),
      readOrderedWorkspaceResponse,
    )
    const { sessions, history } = await read(
      server,
      sessionsPath(org, id),
      readSessions,
    )
    const all = [...sessions, ...history]
    const events = repositoryChangedEvents(detail.workspace, all, member, names)
    for (const event of events) emit(event)
    const changes = {
      baseBranch: names.baseBranch,
      ...(names.displayBaseBranch === undefined
        ? {}
        : { displayBaseBranch: names.displayBaseBranch }),
      unpushedCommits: 0,
      uncommittedFileCount: 0,
      files: [],
      summary: { files: 0, added: 0, removed: 0 },
    }
    server.json('GET', filePaths.changes(org, id), changes)
    emit({ type: 'changes.updated', changes })
    const workspace = movedWorkspace(detail.workspace, names.branch)
    server.handle('GET', workspacePath(org, id), async () =>
      Response.json({
        ...detail,
        workspace,
        ...server.events.stateRead(id),
      }),
    )
    changedReply(server, workspace, server.events.last(id))
    const github = newBranchGitHub(names)
    const { banner, checks } = github
    server.json('GET', githubPaths.banner(org, id), { banner })
    server.json('GET', githubPaths.checks(org, id), checks)
    server.json('GET', githubPaths.stored(org, id), {
      state: { banner, checks },
    })
    emit(github)
  }
  let opened = 0
  // A New session of `masked-repository` opens a session without messages,
  // so the page shows the New session text. The list keeps the session, so
  // a change gives it a note too.
  const openSession = async () => {
    const listed = await read(server, sessionsPath(org, id), readSessions)
    opened += 1
    const session: Session = {
      ...listed.sessions[0],
      id: `new-${opened}`,
      title: null,
      createdAt: now(),
      activeTurnId: null,
      activeTurnStartedAt: null,
      retryMessageId: null,
    }
    const eventNumber = server.events.last(id)
    const sessions = [...listed.sessions, session]
    server.json('GET', sessionsPath(org, id), {
      ...listed,
      sessions,
      eventNumber,
    })
    return Response.json({ session, eventNumber }, { status: 201 })
  }
  return async (input, init) => {
    const { pathname } = new URL(input, FAKE_ORIGIN)
    const method = init?.method ?? 'GET'
    const masked = branches === 'masked-repository'
    if (method === 'POST' && pathname === sessionsPath(org, id) && masked)
      return openSession()
    if (method === 'POST' && pathname === workspacePaths.repository(org, id)) {
      if (bodyOf(init).allowWork === true) publishes = true
    }
    const poll = workspacePaths.repositoryResult(org, id, CHANGE_ID)
    if (method === 'GET' && pathname === poll && publishes) {
      publishes = false
      await publish()
    }
    return next(input, init)
  }
}
