import type { OperatorLongRun } from '../../shared/operator'
import { WORKSPACE_STATES } from '../../shared/workspace-read'
import { choice, count, maybeCount, maybeText, record, text } from './parse'

/** One long run of the Overview: a running workspace and its run start. */
export function readLongRun(value: unknown): OperatorLongRun {
  const run = record(value, 'longRun')
  return {
    workspaceId: text(run, 'workspaceId'),
    workspaceNumber: count(run, 'workspaceNumber'),
    orgId: text(run, 'orgId'),
    orgName: text(run, 'orgName'),
    orgStatus: choice(run, 'orgStatus', ['active', 'suspended', 'deleted']),
    ownerGithubId: count(run, 'ownerGithubId'),
    ownerLogin: text(run, 'ownerLogin'),
    ownerStatus: choice(run, 'ownerStatus', ['active', 'suspended']),
    cloudComputerId: maybeText(run, 'cloudComputerId'),
    state: choice(run, 'state', WORKSPACE_STATES),
    runningSince: count(run, 'runningSince'),
    lastActivityAt: maybeCount(run, 'lastActivityAt'),
  }
}
