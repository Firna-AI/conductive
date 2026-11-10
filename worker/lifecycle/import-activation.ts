import { pinImportImage } from './import-image-admission'
import type { ActivateWorkspaceResponse } from '../../src/shared/workspaces'
import type { RunnerImportReply } from '../../src/shared/runner-import'
import { runnerSoftware } from '../configuration'
import { readUser } from '../data/users'
import {
  requireActiveOrg,
  requireActiveWorkspaceOwner,
} from '../data/user-access'
import { readPublishedImport } from '../conductor-import/activation-data'
import { HttpError } from '../http'
import { requireOrgMember } from './access'
import type { AppDependencies, AppEnv } from '../env'
import type { DurableLifecycle } from './durable'
import { importActivationGuard } from './import-activation-data'
import { WORKSPACE_START_TIME_LIMIT_MS } from './job-time-limit'
import type { StartJobStorage, WorkspaceStartJob } from './start-types'
import { serializeStartJob, readStartJob } from './start-job-codec'
import type { WorkspaceStartCoordinator } from './start-coordinator'
import type { WorkspacePlatform } from './workspace-platform'
import { readWorkspace, workspaceView } from './workspace-data'
import { requireActiveStartUsers } from './start-access'
import { startTimeLimitReached } from './start-provider-retry'
import {
  retainedActivation,
  releaseInterruptedActivation,
} from './import-activation-recovery'
import { ARCHIVE_RESERVATION_KEY } from './archive-types'
import { IMPORT_CHECKPOINT_KEY } from './import-activation-cleanup'
import { claimActivationFence } from './import-activation-fence'

export async function ensureActivationSession(
  env: AppEnv,
  platform: Pick<WorkspacePlatform, 'seedImportSession'>,
  job: Extract<WorkspaceStartJob, { kind: 'activate' }>,
) {
  await claimActivationFence(env.DB, job)
  const starter = await readUser(env.DB, job.activation.activatorUserId)
  if (!starter || !platform.seedImportSession)
    throw new Error('The activation session could not be stored.')
  const row = await readWorkspace(env.DB, job.orgId, job.workspaceId)
  await platform.seedImportSession(job.workspaceId, {
    id: job.activation.sessionId,
    starter,
    choice: { agent: row.agent, model: row.model, effort: row.effort },
  })
  await env.DB.prepare(
    `UPDATE workspace_runtime SET session_id = ? WHERE workspace_id = ? AND session_id IS NULL
    AND EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_runtime.workspace_id AND ${importActivationGuard})`,
  )
    .bind(
      job.activation.sessionId,
      job.workspaceId,
      job.activation.activatorUserId,
    )
    .run()
}

export function importActivationMethods(
  env: AppEnv,
  dependencies: AppDependencies,
  platform: WorkspacePlatform,
  lifecycle: DurableLifecycle,
  storage: StartJobStorage,
  starts: () => WorkspaceStartCoordinator,
) {
  return {
    async activateImportedWorkspace(
      orgId: string,
      workspaceId: string,
      userId: string,
    ): Promise<ActivateWorkspaceResponse> {
      await requireActiveOrg(env.DB, orgId)
      await requireOrgMember(env.DB, orgId, userId)
      let row = await readWorkspace(env.DB, orgId, workspaceId)
      await requireActiveWorkspaceOwner(env.DB, row.ownerUserId, orgId)
      if (row.archivedAt !== null)
        throw new HttpError(
          409,
          'workspace_archived',
          'The archived workspace cannot start.',
        )
      if (await platform.storage.get('text', ARCHIVE_RESERVATION_KEY))
        throw new HttpError(
          409,
          'workspace_archived',
          'The archived workspace cannot start.',
        )
      if (!row.conductorLocalId || !row.importerUserId)
        throw new HttpError(
          404,
          'workspace_not_found',
          'The workspace is not available.',
        )
      let current = await storage.job()
      const checkpoint = await platform.storage.get(
        'job',
        IMPORT_CHECKPOINT_KEY,
      )
      if (row.activatedAt !== null) {
        const saved =
          current?.kind === 'activate'
            ? current
            : checkpoint
              ? readStartJob(checkpoint)
              : undefined
        if (saved?.kind !== 'activate')
          throw new Error('Missing activation session identity.')
        return {
          workspace: workspaceView(row, env.APP_ORIGIN),
          start: (await lifecycle.read())?.start ?? null,
          error: null,
          sessionId: saved.activation.sessionId,
        }
      }
      if (!current) {
        const published = await readPublishedImport(env, orgId, workspaceId)
        const now = dependencies.now()
        const epoch = await storage.epoch()
        const retained = retainedActivation(
          checkpoint ? readStartJob(checkpoint) : undefined,
          row,
          userId,
          epoch,
          dependencies.randomToken(),
          now,
        )
        if (!retained)
          await releaseInterruptedActivation(env, platform.storage, row, now)
        const image = retained
          ? null
          : await pinImportImage(env.DB, row, userId)
        const candidate: WorkspaceStartJob =
          retained ??
          (() => {
            if (!image) throw new Error('Missing activation image capture.')
            return {
              kind: 'activate',
              workspaceId,
              orgId,
              providerAccount: image.providerAccount,
              imageName: image.imageName,
              startupScript: image.startupScript,
              environmentCiphertext: image.environmentCiphertext,
              defaultBranch: image.repository.defaultBranch,
              repositoryLocations: image.repositoryLocations,
              turnId: null,
              attempt: dependencies.randomToken(),
              requestedByUserId: userId,
              phase: 'machine',
              processId: null,
              stdoutOffset: 0,
              stderrOffset: 0,
              deadlineAt: now + WORKSPACE_START_TIME_LIMIT_MS,
              activation: {
                sessionId:
                  checkpoint?.kind === 'activate' &&
                  checkpoint.activation.activatorUserId === userId
                    ? checkpoint.activation.sessionId
                    : dependencies.randomToken(),
                activatorUserId: userId,
                importerUserId: published.importerUserId,
                software: runnerSoftware(env),
                snapshot: published.snapshot,
                epoch,
                cursor: 0,
                partOffset: 0,
                sequence: 0,
              },
            } satisfies WorkspaceStartJob
          })()
        await lifecycle.initialize({ workspaceId, orgId, imported: true })
        await platform.storage.put(
          'job',
          IMPORT_CHECKPOINT_KEY,
          serializeStartJob(candidate),
        )
        await starts().enqueue(candidate)
        current = await storage.job()
      }
      if (current?.kind !== 'activate')
        throw new HttpError(
          409,
          'workspace_start_failed',
          'The cloud computer could not start. Try again.',
        )
      await ensureActivationSession(env, platform, current)
      await platform.storage.put(
        'job',
        IMPORT_CHECKPOINT_KEY,
        serializeStartJob(current),
      )
      row = await readWorkspace(env.DB, orgId, workspaceId)
      const state = await lifecycle.read()
      return {
        workspace: workspaceView(row, env.APP_ORIGIN),
        start: state?.start ?? null,
        error: state?.error ?? null,
        sessionId: current.activation.sessionId,
      }
    },
    sendImportCommand: (
      workspaceId: string,
      command: Parameters<
        NonNullable<WorkspacePlatform['sendImportCommand']>
      >[1],
    ) =>
      platform.sendImportCommand?.(workspaceId, command) ??
      Promise.resolve(null),
    async seedImportSession(
      workspaceId: string,
      input: Parameters<NonNullable<WorkspacePlatform['seedImportSession']>>[1],
    ) {
      if (!platform.seedImportSession)
        throw new Error('The import session store is unavailable.')
      await platform.seedImportSession(workspaceId, input)
    },
    async activationCredentialSender(activationId: string) {
      const job = await storage.job()
      if (
        job?.kind !== 'activate' ||
        job.attempt !== activationId ||
        job.phase !== 'import-restore' ||
        job.cancelled ||
        job.failure ||
        startTimeLimitReached(job, dependencies.now()) ||
        job.activation.epoch !== (await storage.epoch())
      )
        return null
      await requireActiveStartUsers(env.DB, job)
      const row = await readWorkspace(env.DB, job.orgId, job.workspaceId)
      return row.archivedAt === null ? job.activation.activatorUserId : null
    },
    async receiveImportResult(reply: RunnerImportReply, connectionId: string) {
      const job = await storage.job()
      if (
        job?.kind !== 'activate' ||
        job.cancelled ||
        job.failure ||
        startTimeLimitReached(job, dependencies.now())
      )
        return
      const pending = job.activation.pending
      if (
        job.attempt !== reply.activationId ||
        job.activation.epoch !== reply.epoch ||
        reply.epoch !== (await storage.epoch()) ||
        pending?.commandId !== reply.commandId ||
        pending.connectionId !== connectionId ||
        reply.connectionId !== connectionId
      )
        return
      await requireActiveStartUsers(env.DB, job)
      const row = await readWorkspace(env.DB, job.orgId, job.workspaceId)
      if (row.archivedAt !== null) return
      await storage.update({
        ...job,
        activation: {
          ...job.activation,
          pending: { ...pending, result: reply.result },
        },
      })
      await storage.schedule(dependencies.now())
    },
  }
}
