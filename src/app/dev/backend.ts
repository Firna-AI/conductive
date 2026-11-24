import type { Workspace } from '../../shared/generated/Workspace'
import { orgSuspendedReason } from '../../ui/components/orgs/suspension'
import { orgPath } from '../../shared/api'
import type { WorkspaceEvent } from '../../shared/events'
import { leaveOrgPath } from '../../shared/orgs'
import type { Section } from '../../shared/sections'
import { workspacePath, type WorkspaceResponse } from '../../shared/workspaces'
import type { FakeWorkspaceEvents } from '../../test-support/fake-events'
import { replaceWorkspace } from '../list-trees'
import { orgSuspendedCode } from '../suspension'
import { ID, match, RouteError } from './router'
import type { DevState, OrgState } from './state'

/** What the routes of the dev fake share: the state, the clock, and the events. */
export interface DevBackend {
  readonly state: DevState
  /** The time now, in Unix milliseconds. It starts at `FAKE_TIME`. */
  readonly now: () => number
  readonly newId: () => string
  readonly events: FakeWorkspaceEvents
  /** Sends a live event of a workspace to each open stream. */
  readonly emit: (workspaceId: string, event: WorkspaceEvent) => void
}

export function createBackend(
  state: DevState,
  events: FakeWorkspaceEvents,
  now: () => number,
  newId: () => string,
): DevBackend {
  return {
    state,
    now,
    newId,
    events,
    emit: (workspaceId, event) => {
      events.emit({
        workspaceId,
        eventNumber: events.last(workspaceId) + 1,
        occurredAt: now(),
        event,
      })
    },
  }
}

export function requireOrg(state: DevState, orgId: string): OrgState {
  const org = state.orgs.find((item) => item.org.id === orgId)
  if (!org) {
    throw new RouteError(404, 'org_not_found', 'The org is not available.')
  }
  return org
}

export function requireWorkspace(
  org: OrgState,
  workspaceId: string,
): Workspace {
  const workspace = org.workspaces.find((item) => item.id === workspaceId)
  if (!workspace) {
    throw new RouteError(
      404,
      'workspace_not_found',
      'The workspace is not available.',
    )
  }
  return workspace
}

export function requireSection(org: OrgState, sectionId: string): Section {
  const section = org.sections.find((item) => item.id === sectionId)
  if (!section) {
    throw new RouteError(
      404,
      'section_not_found',
      'The section is not available.',
    )
  }
  return section
}

/** The methods that only read, which a suspended org still answers. */
const reads: ReadonlySet<string> = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * Refuses a request under an org or a workspace that the user cannot
 * reach, also when the recorded server has a reply for it. The Worker
 * checks the membership of every org path in the same way. A suspended
 * org refuses each write with `org_suspended`, except a leave, as the
 * Worker does.
 */
export function guardScope(
  state: DevState,
  path: string,
  method = 'GET',
): void {
  const scope = match(orgPath(ID.org), path, true)
  if (!scope) return
  const org = requireOrg(state, scope.org)
  const leave = method === 'POST' && path === leaveOrgPath(scope.org)
  if (org.org.suspension && !reads.has(method) && !leave) {
    throw new RouteError(403, orgSuspendedCode, orgSuspendedReason)
  }
  const inner = match(workspacePath(ID.org, ID.workspace), path, true)
  if (inner) requireWorkspace(org, inner.workspace)
}

export function workspaceDetail(
  org: OrgState,
  workspaceId: string,
): WorkspaceResponse {
  const workspace = requireWorkspace(org, workspaceId)
  const start = org.starts.get(workspaceId)
  return { workspace, start: start?.start ?? null, error: start?.error ?? null }
}

/**
 * Puts a changed workspace in its place in the list, and sends it to the
 * open tabs. A read gives the current record and its cutoff. A stream
 * sends the updates after its cursor. An Archive gives the
 * live workspaces under the archived one its section and its place, as
 * the Worker does.
 */
export function changeWorkspace(
  backend: DevBackend,
  org: OrgState,
  workspace: Workspace,
): void {
  org.workspaces = replaceWorkspace(
    org.workspaces,
    workspace.id,
    () => workspace,
  )
  backend.emit(workspace.id, { type: 'workspace.updated', workspace })
}
