import { revokeMachineTokenOnStop } from '../machines/revoke'
import { WORKSPACE_RESTORE_MS } from '../../src/shared/workspaces'
import type { SandboxProvider } from '../sandbox/provider'
import { providerState } from './provider-state'
import type { ArchiveResource } from './archive-data'
import { sameArchive, type WorkspaceArchiveState } from './archive-types'
import { DISK_KEEPALIVE_MS } from './durable-types'
import { WORKSPACE_START_TIME_LIMIT_MS } from './job-time-limit'
import type { AppDependencies, AppEnv } from '../env'
import { machineEnvironment, workspaceMachineOwner } from '../machines/client'

export async function advanceArchiveMaintenance(
  state: WorkspaceArchiveState,
  row: ArchiveResource,
  provider: SandboxProvider,
  now: () => number,
  save: (state: WorkspaceArchiveState) => Promise<void>,
  readCurrent: () => Promise<ArchiveResource | null>,
  requiresDiskRestart: boolean,
  env: AppEnv,
  dependencies: Pick<AppDependencies, 'randomToken'>,
): Promise<WorkspaceArchiveState> {
  const expiresAt = state.archivedAt + WORKSPACE_RESTORE_MS
  if (state.phase === 'retained') {
    if (!requiresDiskRestart) return state
    const needsRestart =
      state.stoppedAt === null ||
      expiresAt > state.stoppedAt + WORKSPACE_RESTORE_MS
    if (
      !needsRestart ||
      row.ownerSuspended !== null ||
      row.orgSuspended !== null
    )
      return state
    if (state.stoppedAt !== null && state.stoppedAt + DISK_KEEPALIVE_MS > now())
      return state
    state = {
      ...state,
      phase: 'resume',
      maintenanceDeadlineAt: now() + WORKSPACE_START_TIME_LIMIT_MS,
    }
    await save(state)
  }
  if (
    state.phase !== 'resume' &&
    state.phase !== 'wait' &&
    state.phase !== 'stop'
  )
    return state
  if (!state.sandboxId) return { ...state, phase: 'retained' }
  const sandboxId = state.sandboxId
  if (!requiresDiskRestart && state.phase === 'resume')
    state = { ...state, phase: 'stop' }
  let status = providerState((await provider.get(sandboxId)).state)
  if (state.phase === 'resume') {
    if (status === 'stopped')
      await revokeMachineTokenOnStop(
        env,
        workspaceMachineOwner(state.orgId, state.workspaceId),
        'retry',
      )
    const current = await readCurrent()
    if (
      !current ||
      !sameArchive(current, state) ||
      current.sandboxId !== sandboxId ||
      current.orgDeleted !== null ||
      now() >= expiresAt ||
      current.ownerSuspended !== null ||
      current.orgSuspended !== null
    )
      return { ...state, phase: 'retained' }
    if (status === 'stopping') return state
    if (status === 'stopped') {
      // A maintenance start receives no workspace token or saved environment values.
      await provider.resume(
        sandboxId,
        await machineEnvironment(
          env,
          workspaceMachineOwner(state.orgId, state.workspaceId),
          dependencies.randomToken,
        ),
        1_800,
      )
    }
    return { ...state, phase: 'wait' }
  }
  if (state.phase === 'wait') {
    if (status === 'starting' && now() < (state.maintenanceDeadlineAt ?? now()))
      return state
    state = { ...state, phase: 'stop', stopRequestedAt: undefined }
    await save(state)
  }
  if (status !== 'stopped') {
    if (status === 'stopping') return state
    if (state.stopRequestedAt === undefined) {
      state = { ...state, stopRequestedAt: now() }
      await save(state)
    }
    await revokeMachineTokenOnStop(
      env,
      workspaceMachineOwner(state.orgId, state.workspaceId),
    )
    status = providerState((await provider.stop(sandboxId)).state)
    if (status !== 'stopped') return state
  }
  await revokeMachineTokenOnStop(
    env,
    workspaceMachineOwner(state.orgId, state.workspaceId),
    'retry',
  )
  return {
    ...state,
    phase: 'retained',
    stoppedAt: state.stopRequestedAt ?? state.stoppedAt,
    stopRequestedAt: undefined,
    maintenanceDeadlineAt: undefined,
  }
}

export function archiveMaintenanceDue(
  state: WorkspaceArchiveState,
  row: ArchiveResource,
  now: number,
  requiresDiskRestart: boolean,
) {
  const expiresAt = state.archivedAt + WORKSPACE_RESTORE_MS
  if (state.phase !== 'retained') return Math.min(now + 5_000, expiresAt)
  if (!requiresDiskRestart) return expiresAt
  if (row.ownerSuspended !== null || row.orgSuspended !== null) return expiresAt
  return state.stoppedAt === null ||
    expiresAt > state.stoppedAt + WORKSPACE_RESTORE_MS
    ? Math.min(
        Math.max(
          now,
          (state.stoppedAt ?? now - DISK_KEEPALIVE_MS) + DISK_KEEPALIVE_MS,
        ),
        expiresAt,
      )
    : expiresAt
}
