import type { MessageSender } from '../shared/generated/MessageSender'
import type { Session } from '../shared/generated/Session'
import type { Workspace } from '../shared/generated/Workspace'
import { repositoryFailure } from '../../docs/mockups/src/components/workspace/repositoryMoveCopy'
import { pullRequest } from '../../docs/mockups/src/fixtures/pullRequests'
import {
  movedBranch,
  repositoryWork,
} from '../../docs/mockups/src/fixtures/repositoryMove'
import type { FetchLike } from '../app/api/client'
import { readOrderedWorkspaceResponse } from '../app/api/read-workspaces'
import { readSessions } from '../chat/api/read-responses'
import type { WorkspaceEvent } from '../shared/events'
import { filePaths } from '../shared/files'
import { sessionsPath } from '../shared/sessions'
import { workspaceViewPath } from '../shared/workspace-view'
import { workspacePath, workspacePaths } from '../shared/workspaces'
import type { FakeApiServer } from './fake-api'
import { bodyOf, read } from './fake-bar-dev'
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
const CHANGE_ID = `repository-change-${id}`

/** The repository that the member picks, as the mockups pick it. */
const MOVED_REPOSITORY = {
  id: 'billing-service',
  fullName: 'acme/billing-service',
} as const

/** The new branch in the folder of the new repository. */
export const MOVED_BRANCH = movedBranch

/** How a repository change of the fake ends. */
export type FakeRepositoryEnd = 'changed' | 'question' | 'clash' | 'outdated'

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

/** The question of the change, with the work of the mockups. */
const repositoryQuestionReply = {
  state: 'confirmation-required',
  repository: MOVED_REPOSITORY,
  branch: workspaceFixtures().detail.workspace.branch,
  baseBranch: 'main',
  work: {
    localWork: {
      uncommittedFiles: repositoryWork.left.files,
      unpushedCommits: repositoryWork.left.commits,
    },
    pullRequest: { number: pullRequest.number, url: pullRequest.url },
    pushedCommits: repositoryWork.pushedCommits,
    carriedFiles: repositoryWork.carried.files,
  },
} as const

/**
 * The replies of a change start and its poll. A `changed` poll needs the
 * event number of the published events, so `changedReply` gives it.
 */
export function serveRepositoryChange(
  server: FakeApiServer,
  end: FakeRepositoryEnd,
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
  if (end === 'question') server.json('GET', poll, repositoryQuestionReply)
  if (end === 'clash') {
    const error = {
      code: 'workspace_repository_change_failed',
      message: repositoryFailure.clash(MOVED_REPOSITORY.fullName),
    }
    server.json('GET', poll, { error }, 409)
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

/** The record of the workspace after the change. */
export function movedWorkspace(workspace: Workspace): Workspace {
  return {
    ...workspace,
    repositoryId: MOVED_REPOSITORY.id,
    branch: MOVED_BRANCH,
    github: null,
  }
}

/**
 * The events of a repository change, as the Worker publishes them in one
 * chat transaction: the workspace in the new repository, and one note for
 * each session.
 */
export function repositoryChangedEvents(
  workspace: Workspace,
  sessions: readonly Session[],
  member: MessageSender,
): WorkspaceEvent[] {
  return [
    { type: 'workspace.updated', workspace: movedWorkspace(workspace) },
    ...sessions.map((session): WorkspaceEvent => ({
      type: 'workspace.repository-changed',
      sessionId: session.id,
      member,
      repository: MOVED_REPOSITORY,
      branch: MOVED_BRANCH,
      baseBranch: 'main',
    })),
  ]
}

/**
 * A fetch over the fake server that answers a repository change as the
 * Worker does. A change that ends publishes the workspace in the new
 * repository, a note in each session, and the empty changes report of the
 * new branch. Every other request goes to `next`. Development only.
 */
export function repositoryFetch(
  server: FakeApiServer,
  end: FakeRepositoryEnd,
  member: MessageSender,
  now: () => number,
  next: FetchLike,
): FetchLike {
  serveRepositoryChange(server, end)
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
    for (const event of repositoryChangedEvents(detail.workspace, all, member))
      emit(event)
    const changes = {
      baseBranch: 'main',
      unpushedCommits: 0,
      uncommittedFileCount: 0,
      files: [],
      summary: { files: 0, added: 0, removed: 0 },
    }
    server.json('GET', filePaths.changes(org, id), changes)
    emit({ type: 'changes.updated', changes })
    const last = server.events.history(
      Number.MAX_SAFE_INTEGER,
    ).throughEventNumber
    const workspace = movedWorkspace(detail.workspace)
    server.json('GET', workspacePath(org, id), {
      ...detail,
      workspace,
      eventNumber: last,
    })
    changedReply(server, workspace, last)
  }
  return async (input, init) => {
    const { pathname } = new URL(input, FAKE_ORIGIN)
    const method = init?.method ?? 'GET'
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
