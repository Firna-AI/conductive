import type { ArchiveContext } from './archive-context'
import { finishArchiveRestore } from './archive-restore-state'
import { WORKSPACE_RESTORE_MS } from '../../src/shared/workspaces'
import { providerForAccount } from '../sandbox/client'
import { warnWorker } from '../warnings'
import { errorSummary, WarningId } from '../warning-values'
import { CREATE_CHECKPOINT_KEY } from '../members/creation-checkpoint'
import { prepareArchivedLifecycle } from './archive-start'
import { readStartJob, serializeStartJob } from './start-job-codec'
import { readWorkspaceAllocation } from './start-allocation'
import { createResource } from './resource-intents'
import { recordSandboxCleanup, retrySandboxCleanup } from './cleanup'
import { readWorkspace, workspaceRecord } from './workspace-data'
import {
  readArchiveResource,
  writeArchiveDisk,
  detachArchiveDisk,
  scheduleArchiveRepair,
} from './archive-data'
import {
  ARCHIVE_STATE_KEY,
  ARCHIVE_REVISION_KEY,
  ARCHIVE_RESERVATION_KEY,
  sameArchive,
  type WorkspaceArchiveState,
} from './archive-types'
import {
  advanceArchiveMaintenance,
  archiveMaintenanceDue,
} from './archive-maintenance'
import { releaseImageLease } from './image-leases'
import { clearMissingArchiveDisk } from './archive-missing'

export class WorkspaceArchive {
  private readonly context: ArchiveContext
  constructor(context: ArchiveContext) {
    this.context = context
  }

  private save(state: WorkspaceArchiveState) {
    return this.context.storage.put('archive', ARCHIVE_STATE_KEY, state)
  }

  async begin(workspaceId: string): Promise<void> {
    const { storage, lifecycle, startJobs, env, dependencies } = this.context
    const row = await readArchiveResource(env.DB, workspaceId)
    if (!row || row.archivedAt === null || row.orgDeleted !== null) return
    const revision = (await storage.get('number', ARCHIVE_REVISION_KEY)) ?? 0
    let state = await storage.get('archive', ARCHIVE_STATE_KEY)
    if (!state || state.revision !== revision || !sameArchive(row, state)) {
      const job = await startJobs.job()
      const current = await lifecycle.read()
      state = {
        revision,
        workspaceId,
        orgId: row.orgId,
        archivedAt: row.archivedAt,
        sandboxId: row.sandboxId ?? job?.allocatedSandboxId ?? null,
        providerAccount: row.providerAccount,
        phase: 'initializing',
        stoppedAt: row.stoppedAt ?? current?.stoppedAt ?? null,
        stopRequestedAt: current?.diskRetentionCommand?.stopRequestedAt,
        allocation: job?.createPayloadCiphertext
          ? serializeStartJob(job)
          : undefined,
      }
      const initial = state
      await storage.transaction(async (transaction) => {
        await transaction.put('archive', ARCHIVE_STATE_KEY, initial)
        await transaction.delete(ARCHIVE_RESERVATION_KEY)
        if (job?.kind === 'create')
          await transaction.put(
            'job',
            CREATE_CHECKPOINT_KEY,
            serializeStartJob({
              ...job,
              commandAttempt: `${job.attempt}:archive:${revision}`,
            }),
          )
        await transaction.setAlarm(dependencies.now())
      })
    }
    await this.advance()
  }

  async repair(workspaceId: string): Promise<void> {
    const row = await readArchiveResource(this.context.env.DB, workspaceId)
    if (!row || row.archivedAt === null) return
    if (!(await this.context.storage.get('archive', ARCHIVE_STATE_KEY)))
      await this.begin(workspaceId)
    else await this.context.storage.setAlarm(this.context.dependencies.now())
  }

  async clear(): Promise<void> {
    await this.context.storage.delete([
      ARCHIVE_STATE_KEY,
      ARCHIVE_RESERVATION_KEY,
    ])
    await this.context.storage.deleteAlarm()
  }

  reserve(workspaceId: string): Promise<void> {
    const { storage, dependencies } = this.context
    return storage.transaction(async (transaction) => {
      const revision =
        ((await transaction.get('number', ARCHIVE_REVISION_KEY)) ?? 0) + 1
      await transaction.put('number', ARCHIVE_REVISION_KEY, revision)
      await transaction.put('text', ARCHIVE_RESERVATION_KEY, workspaceId)
      await transaction.setAlarm(dependencies.now())
    })
  }

  restored(stopPending?: boolean): Promise<void> {
    return finishArchiveRestore(this.context, () => this.clear(), stopPending)
  }

  async finishStop(): Promise<boolean> {
    const { storage } = this.context
    const state = await storage.get('archive', ARCHIVE_STATE_KEY)
    if (state && (state.phase === 'wait' || state.phase === 'resume'))
      await this.save({ ...state, phase: 'stop', stopRequestedAt: undefined })
    await this.advance()
    return (
      (await storage.get('archive', ARCHIVE_STATE_KEY))?.phase === 'retained'
    )
  }

  async advance(): Promise<void> {
    const { env, dependencies, storage, publish } = this.context
    const saved = await storage.get('archive', ARCHIVE_STATE_KEY)
    if (!saved) {
      const reserved = await storage.get('text', ARCHIVE_RESERVATION_KEY)
      if (reserved) await this.begin(reserved)
      if (!(await storage.get('archive', ARCHIVE_STATE_KEY))) {
        await storage.delete(ARCHIVE_RESERVATION_KEY)
        await storage.deleteAlarm()
      }
      return
    }
    let state: WorkspaceArchiveState = saved
    const row = await readArchiveResource(env.DB, state.workspaceId)
    if (!row || !sameArchive(row, state)) {
      if (row?.archivedAt === null && row.orgDeleted === null) {
        await this.restored()
        return
      }
      await this.clear()
      return
    }
    if (row.orgDeleted !== null) return
    if (
      row.sandboxId === null &&
      !state.allocation &&
      dependencies.now() >= state.archivedAt + WORKSPACE_RESTORE_MS
    )
      state = {
        ...state,
        sandboxId: null,
        allocation: undefined,
        phase: 'purge',
      }
    if (
      row.stoppedAt !== null &&
      (state.stoppedAt === null || row.stoppedAt > state.stoppedAt)
    )
      state = {
        ...state,
        stoppedAt: row.stoppedAt,
        phase: 'retained',
        stopRequestedAt: undefined,
        maintenanceDeadlineAt: undefined,
      }
    if (
      saved.revision !==
      ((await storage.get('number', ARCHIVE_REVISION_KEY)) ?? 0)
    ) {
      await this.begin(saved.workspaceId)
      return
    }
    await storage.setAlarm(dependencies.now() + 30_000)
    try {
      if (state.phase === 'initializing') {
        state = await prepareArchivedLifecycle(
          { ...this.context, db: env.DB, now: dependencies.now() },
          state,
        )
        await this.save(state)
      }
      if (state.phase === 'resolve' && state.allocation) {
        const job = readStartJob(state.allocation)
        const provider = providerForAccount(
          env,
          dependencies.fetch,
          job.providerAccount,
        )
        const allocation = state
        const input = await readWorkspaceAllocation(env, job)
        const sandbox = await createResource(env.DB, provider, {
          kind: 'sandbox',
          mayHaveAllocated: true,
          ownership: {
            orgId: job.orgId,
            providerAccount: job.providerAccount,
            ownerUserId: job.creation?.user.id ?? input.labels?.user ?? null,
            purpose: 'workspace',
            purposeId: job.workspaceId,
          },
          input,
          persist: () => this.save(allocation),
        })
        state = {
          ...state,
          sandboxId: sandbox.id,
          providerAccount: job.providerAccount,
          phase: 'stop',
        }
        await this.save(state)
      }
      await writeArchiveDisk(env.DB, row, state.sandboxId, state.stoppedAt)
      if (state.sandboxId && state.allocation) {
        state = { ...state, allocation: undefined }
        await this.save(state)
      }
      if (!state.allocation)
        await releaseImageLease(env.DB, state.orgId, state.workspaceId)
      if (
        state.sandboxId &&
        dependencies.now() >= state.archivedAt + WORKSPACE_RESTORE_MS
      ) {
        const sandboxId = state.sandboxId
        state = { ...state, phase: 'purge' }
        await this.save(state)
        await recordSandboxCleanup(env.DB, {
          workspaceId: state.workspaceId,
          orgId: state.orgId,
          sandboxId,
          providerAccount: state.providerAccount,
        })
        if (!(await retrySandboxCleanup(env, dependencies, state.workspaceId)))
          return
        await detachArchiveDisk(
          env.DB,
          { ...row, sandboxId: state.sandboxId },
          dependencies.now(),
        )
        state = { ...state, sandboxId: null, allocation: undefined }
        await this.save(state)
      } else if (state.sandboxId) {
        state = await advanceArchiveMaintenance(
          state,
          row,
          providerForAccount(env, dependencies.fetch, state.providerAccount),
          dependencies.now,
          (next) => this.save(next),
          () => readArchiveResource(env.DB, state.workspaceId),
        )
        await this.save(state)
        await writeArchiveDisk(env.DB, row, state.sandboxId, state.stoppedAt)
      }
      const workspace = workspaceRecord(
        await readWorkspace(env.DB, state.orgId, state.workspaceId),
      )
      const signature = JSON.stringify(workspace)
      if (state.published !== signature) {
        await publish({
          workspaceId: state.workspaceId,
          event: { type: 'workspace.updated', workspace },
          occurredAt: dependencies.now(),
        })
        state = { ...state, published: signature }
        await this.save(state)
      }
      if (!state.sandboxId) await storage.deleteAlarm()
      else {
        const at = archiveMaintenanceDue(state, row, dependencies.now())
        await scheduleArchiveRepair(env.DB, row, at)
        await storage.setAlarm(at)
      }
    } catch (error) {
      let failure = error
      try {
        if (await clearMissingArchiveDisk(this.context, state, row, error)) {
          await this.advance()
          return
        }
      } catch (missingFailure) {
        failure = missingFailure
      }
      warnWorker({
        kind: 'workspace_archive_failed',
        workspaceId: WarningId.checked(state.workspaceId),
        phase: state.phase,
        error: errorSummary(failure),
      })
      await storage.setAlarm(dependencies.now() + 30_000)
    }
  }
}
