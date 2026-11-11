import type { AppEnv } from '../env'
import { recordSandboxCleanup } from './cleanup'
import { detachFailedSandbox } from './failed-workspace-data'
import { revokeWorkspaceToken } from './tokens'
import type { WorkspaceRow } from './workspace-data'
import type { WorkspaceStartJob } from './start-types'
import type { WorkspaceStorage } from './platform-storage'
import { taskWorkspaceStorage } from './workspace-task-alarms'
import { startTimeLimitReached } from './start-provider-retry'

export function retainedActivation(
  saved: WorkspaceStartJob | undefined,
  row: WorkspaceRow,
  userId: string,
  epoch: number,
  token: string,
  now: number,
): Extract<WorkspaceStartJob, { kind: 'activate' }> | null {
  if (
    saved?.kind !== 'activate' ||
    saved.failure ||
    !row.sandboxId ||
    row.sandboxId !== saved.allocatedSandboxId ||
    startTimeLimitReached(saved, now)
  )
    return null
  const firstPhases = ['machine', 'ready', 'import-software', 'import-launch']
  const resumePhase = firstPhases.includes(saved.phase)
    ? 'import-open'
    : [
          'startup',
          'terminal',
          'terminal-password',
          'import-finish',
          'import-publish',
          'runner',
        ].includes(saved.phase)
      ? 'startup'
      : saved.phase
  return {
    ...saved,
    phase: 'machine',
    cancelled: false,
    failure: undefined,
    requestedByUserId: userId,
    commandAttempt: `activation-resume-${token}`,
    afterReadyPhase: firstPhases.includes(saved.phase)
      ? 'import-software'
      : 'import-launch',
    activation: {
      ...saved.activation,
      activatorUserId: userId,
      sessionId:
        saved.activation.activatorUserId === userId
          ? saved.activation.sessionId
          : token,
      epoch,
      launchAttempt: `activation-launch-${token}`,
      resumePhase,
      pending: firstPhases.includes(saved.phase)
        ? undefined
        : saved.activation.pending
          ? { ...saved.activation.pending, connectionId: undefined }
          : undefined,
    },
  }
}

/** A kept but expired activation follows failed-start cleanup before replacement. */
export async function releaseInterruptedActivation(
  env: AppEnv,
  storage: WorkspaceStorage,
  row: WorkspaceRow,
  now: number,
) {
  if (!row.sandboxId) return
  await recordSandboxCleanup(env.DB, {
    workspaceId: row.id,
    orgId: row.orgId,
    sandboxId: row.sandboxId,
    providerAccount: row.providerAccount,
  })
  const cleanup = taskWorkspaceStorage(storage, 'lifecycle:cleanup')
  await cleanup.transaction(async (transaction) => {
    await transaction.put('text', 'lifecycle:cleanup', row.id)
    await transaction.setAlarm(now + 5_000)
  })
  await revokeWorkspaceToken(env.DB, row.id, now)
  await detachFailedSandbox(
    env.DB,
    row.orgId,
    row.id,
    row.sandboxId,
    row.providerAccount,
  )
}
