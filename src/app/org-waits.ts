import type { Workspace } from '../shared/generated/Workspace'
import type { WorkspaceState } from '../shared/generated/WorkspaceState'
import type { BuildsResponse } from '../shared/org-settings'
import type { AutomationRun } from '../shared/automations'
import type { OrgAgentLoginStatus } from '../shared/org-agent-logins'

import type { ListedAutomation } from './api/read-automations'
import { modelListWait } from './endpoint-models'
import type { ListData } from './list-changes'
import type { RefreshWait } from './refresh'

/**
 * How soon a shown part of an org reads again. These are choices of the
 * app, not product limits: soon while a workspace, an automation run, or a
 * build is active, or while the checks of a pull request run, and slowly
 * otherwise, so that changes from other tabs, people, and GitHub show. The
 * services of a shown Preview tool read again after `activeWait` too.
 */
export const activeWait = 5_000
const idleWait = 30_000
const activeStates: ReadonlySet<WorkspaceState> = new Set([
  'working',
  'input',
  'starting',
])

/**
 * Whether a workspace makes its list read soon: its agent works or waits,
 * its cloud computer starts, or the checks of its pull request run, so the
 * colour of its mark changes soon.
 */
function readsSoon(workspace: Workspace): boolean {
  return (
    activeStates.has(workspace.state) || workspace.github === 'checks-running'
  )
}

/**
 * The wait of a shown workspace list: short while one of its workspaces is
 * active or its checks run. A chat that reads the list itself uses it too.
 */
export const workspacesWait: RefreshWait<readonly Workspace[]> = (
  workspaces,
) => (workspaces?.some(readsSoon) ? activeWait : idleWait)

/** A run that waits for its workspace counts as active, as a start does. */
const activeRunStates: ReadonlySet<AutomationRun['state']> = new Set([
  'queued',
  ...activeStates,
])

export const automationsWait: RefreshWait<readonly ListedAutomation[]> = (
  automations,
) =>
  automations?.some(
    (automation) =>
      automation.lastRun && activeRunStates.has(automation.lastRun.state),
  )
    ? activeWait
    : idleWait

export const listWait: RefreshWait<ListData> = (list) =>
  workspacesWait(list?.workspaces)

export const buildsWait: RefreshWait<BuildsResponse> = (builds) =>
  builds?.builds.some((build) => build.state === 'running')
    ? activeWait
    : idleWait

/** Repositories and members read at entry and focus only. */
export const onEntry: RefreshWait<unknown> = () => null

/**
 * The org logins read at entry and focus, and once a minute while an org
 * endpoint is connected, so a model list that the Worker read in the
 * background shows, as `modelListWait` says.
 */
export const orgLoginsWait: RefreshWait<readonly OrgAgentLoginStatus[]> = (
  logins,
) =>
  logins?.some((login) => login.connected && login.kind === 'endpoint')
    ? modelListWait
    : null
