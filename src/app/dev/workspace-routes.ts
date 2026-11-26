import {
  workspacePath,
  workspacePaths,
  workspacesPath,
  type OrderedWorkspaceResponse,
  type WorkspacesResponse,
} from '../../shared/workspaces'
import { choice, count, record } from '../api/parse'
import {
  changeWorkspace,
  requireOrg,
  requireWorkspace,
  workspaceDetail,
  type DevBackend,
} from './backend'
import { ID, json, noContent, type Params, type Route } from './router'
import { resumeWorkspace, stopLater } from './start-steps'
import type { OrgState } from './state'
import {
  archiveWorkspace,
  restoreWorkspace,
  updateWorkspace,
} from './workspace-writes'

function orderedDetailReply(
  backend: DevBackend,
  org: OrgState,
  workspaceId: string,
  includeSeed = false,
): Response {
  const order = includeSeed
    ? backend.events.stateRead(workspaceId)
    : { eventNumber: backend.events.last(workspaceId) }
  return json({
    ...workspaceDetail(org, workspaceId),
    ...order,
  } satisfies OrderedWorkspaceResponse)
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
  return orderedDetailReply(backend, org, workspaceId, true)
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
      // The list keeps the removed workspaces, as the Worker does, so that
      // their links still resolve. The app leaves them out of its groups.
      method: 'GET',
      path: workspacesPath(ID.org),
      answer: ({ params }) =>
        json({
          workspaces: orgOf(params).workspaces,
          repositories: orgOf(params).repositories.map(
            ({ id, fullName, defaultBranch, selected }) => ({
              id,
              fullName,
              defaultBranch,
              selected,
            }),
          ),
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
      answer: ({ params }) =>
        archiveWorkspace(backend, orgOf(params), params.workspace),
    },
    {
      method: 'POST',
      path: workspacePaths.restore(ID.org, ID.workspace),
      answer: ({ params }) =>
        restoreWorkspace(backend, orgOf(params), params.workspace),
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
  ]
}
