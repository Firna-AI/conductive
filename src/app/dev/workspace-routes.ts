import {
  workspacePath,
  workspacePaths,
  workspacesPath,
  type ArchiveCheckResponse,
  type OrderedWorkspaceResponse,
  type WorkspaceResponse,
  type WorkspacesResponse,
} from '../../shared/workspaces'
import { choice, count, flag, record, text } from '../api/parse'
import { moveWorkspace } from '../sections'
import {
  changeWorkspace,
  requireOrg,
  requireSection,
  requireWorkspace,
  workspaceDetail,
  type DevBackend,
} from './backend'
import {
  ID,
  json,
  noContent,
  optional,
  requiredText,
  type Params,
  type Route,
} from './router'
import { cancelStart, resumeWorkspace, stopLater } from './start-steps'
import type { OrgState } from './state'

function detailReply(org: OrgState, workspaceId: string): Response {
  return json(workspaceDetail(org, workspaceId) satisfies WorkspaceResponse)
}

function orderedDetailReply(
  backend: DevBackend,
  org: OrgState,
  workspaceId: string,
): Response {
  return json({
    ...workspaceDetail(org, workspaceId),
    eventNumber: backend.eventNumber,
  } satisfies OrderedWorkspaceResponse)
}

/**
 * Rename, and the move of a drag. `position` is the index in the target
 * section without the moved workspace, and the list order follows it.
 */
function updateWorkspace(
  backend: DevBackend,
  org: OrgState,
  workspaceId: string,
  body: unknown,
): Response {
  const fields = record(body)
  const name = optional(fields, 'name', requiredText)
  const sectionId = optional(fields, 'sectionId', text)
  const position = optional(fields, 'position', count)
  const current = requireWorkspace(org, workspaceId)
  if (sectionId !== undefined) requireSection(org, sectionId)
  if (sectionId !== undefined || position !== undefined) {
    org.workspaces = moveWorkspace(
      org.workspaces,
      org.sections,
      workspaceId,
      sectionId ?? current.sectionId,
      position ?? 0,
    )
  }
  const moved = requireWorkspace(org, workspaceId)
  changeWorkspace(backend, org, { ...moved, name: name ?? moved.name })
  return detailReply(org, workspaceId)
}

/** Reads detail and starts the stop preview for an active workspace. */
function readWorkspace(
  backend: DevBackend,
  org: OrgState,
  workspaceId: string,
): Response {
  const current = requireWorkspace(org, workspaceId)
  if (current.state !== 'stopped' && backend.state.stopAfterMs !== null) {
    stopLater(backend, org, workspaceId, backend.state.stopAfterMs)
  }
  return orderedDetailReply(backend, org, workspaceId)
}

/** Archive deletes the cloud computer and keeps the chat read-only. */
function archiveWorkspace(
  backend: DevBackend,
  org: OrgState,
  workspaceId: string,
  body: unknown,
): Response {
  flag(record(body), 'discardUnpushedWork')
  const current = requireWorkspace(org, workspaceId)
  if (current.state !== 'archived') {
    cancelStart(org, workspaceId)
    org.starts.set(workspaceId, { start: null, error: null })
    const at = backend.now()
    changeWorkspace(backend, org, {
      ...current,
      state: 'archived',
      archivedAt: at,
      updatedAt: at,
    })
  }
  return detailReply(org, workspaceId)
}

/** Output that the open workspace shows counts as read. */
function markRead(
  backend: DevBackend,
  org: OrgState,
  workspaceId: string,
  body: unknown,
): Response {
  count(record(body), 'throughEventNumber')
  const current = requireWorkspace(org, workspaceId)
  if (current.state === 'unread') {
    changeWorkspace(backend, org, { ...current, state: 'ready' })
  }
  return noContent()
}

/**
 * The workspace list and the actions of one workspace. Create workspace
 * lives in `create-routes.ts`.
 */
export function workspaceRoutes(backend: DevBackend): Route[] {
  const orgOf = (params: Params) => requireOrg(backend.state, params.org)
  const one = workspacePath(ID.org, ID.workspace)
  return [
    {
      method: 'GET',
      path: workspacesPath(ID.org),
      answer: ({ params }) =>
        json({
          workspaces: orgOf(params).workspaces,
        } satisfies WorkspacesResponse),
    },
    {
      method: 'GET',
      path: one,
      answer: ({ params }) =>
        readWorkspace(backend, orgOf(params), params.workspace),
    },
    {
      method: 'PATCH',
      path: one,
      answer: ({ params, body }) =>
        updateWorkspace(backend, orgOf(params), params.workspace, body),
    },
    {
      method: 'POST',
      path: workspacePaths.resume(ID.org, ID.workspace),
      answer: ({ params }) => {
        const org = orgOf(params)
        resumeWorkspace(backend, org, params.workspace)
        return orderedDetailReply(backend, org, params.workspace)
      },
    },
    {
      method: 'POST',
      path: workspacePaths.archive(ID.org, ID.workspace),
      answer: ({ params, body }) =>
        archiveWorkspace(backend, orgOf(params), params.workspace, body),
    },
    {
      method: 'PUT',
      path: workspacePaths.read(ID.org, ID.workspace),
      answer: ({ params, body }) =>
        markRead(backend, orgOf(params), params.workspace, body),
    },
    {
      method: 'POST',
      path: workspacePaths.activity(ID.org, ID.workspace),
      answer: ({ body }) => {
        choice(record(body), 'source', ['input', 'terminal', 'preview'])
        return noContent()
      },
    },
    {
      method: 'GET',
      path: workspacePaths.archiveCheck(ID.org, ID.workspace),
      // A workspace that the fake made has no work to lose. The others
      // keep the recorded check, which finds work.
      answer: ({ params }) =>
        orgOf(params).created.has(params.workspace)
          ? json({
              uncommittedFiles: [],
              unpushedCommits: 0,
            } satisfies ArchiveCheckResponse)
          : null,
    },
  ]
}
