import type { AppDependencies, AppEnv } from '../env'
import { requireOrgMember } from '../lifecycle/access'
import { requireActiveWorkspaceOwner } from '../data/user-access'
import { readWorkspace } from '../lifecycle/workspace-data'
import { leasedCreationImage } from '../lifecycle/image-leases'
import { ensureWorkspaceToken, readWorkspaceToken } from '../lifecycle/tokens'
import {
  readStartJob,
  type StoredWorkspaceStartJob,
} from '../lifecycle/start-job-codec'
import type { WorkspaceController } from '../lifecycle/workspace-controller-types'
import { decrypt } from '../security/crypto'
import { HttpError, isRecord } from '../http'
import { nativeWorkspaceStorage } from '../lifecycle/platform-storage'
import { LIFECYCLE_FENCE_KEY, type ReceiverFence } from './receiver-fence'
import type { ReceiverStorage } from './receiver-storage'

export const CREATE_CHECKPOINT_KEY = 'members:create-checkpoint'

export async function resumeCreationCheckpoint(
  storage: ReceiverStorage,
  env: AppEnv,
  dependencies: AppDependencies,
  controller: WorkspaceController,
  orgId: string,
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  const saved = await storage.get<StoredWorkspaceStartJob>(
    CREATE_CHECKPOINT_KEY,
  )
  if (
    !saved ||
    saved.kind !== 'create' ||
    saved.workspaceId !== workspaceId ||
    saved.orgId !== orgId
  )
    return false
  const generation =
    (await storage.get<ReceiverFence>(LIFECYCLE_FENCE_KEY))?.generation ?? 0
  await requireOrgMember(env.DB, orgId, userId)
  const row = await readWorkspace(env.DB, orgId, workspaceId)
  await requireActiveWorkspaceOwner(env.DB, row.ownerUserId)
  if (!['stopped', 'error'].includes(row.state) || row.archivedAt !== null)
    return false
  const job = readStartJob(saved)
  job.cancelled = false
  job.failure = undefined
  job.providerRetry = null
  job.processId = null
  job.stdoutOffset = 0
  job.stderrOffset = 0
  job.requestedByUserId = userId
  if (job.phase !== 'records') job.phase = 'machine'
  try {
    if (!row.sandboxId) {
      const image = await leasedCreationImage(
        env.DB,
        orgId,
        workspaceId,
        row.repositoryId,
      )
      if (image.imageName !== job.imageName)
        throw new HttpError(
          409,
          'image_required',
          'Ask an org admin to build the cloud computer image first.',
        )
    }
    await ensureWorkspaceToken(
      env,
      workspaceId,
      dependencies.randomToken,
      dependencies.now(),
    )
    if (!row.sandboxId && job.createPayloadCiphertext) {
      const payload: unknown = JSON.parse(
        await decrypt(
          job.createPayloadCiphertext,
          JSON.stringify([
            'workspace-create-payload',
            workspaceId,
            job.attempt,
          ]),
          env.BOAT_KEY_ENCRYPTION_KEY,
        ),
      )
      if (
        !isRecord(payload) ||
        !isRecord(payload.env) ||
        payload.env.WORKSPACE_TOKEN !==
          (await readWorkspaceToken(env, workspaceId))
      )
        throw new HttpError(
          409,
          'workspace_token_unavailable',
          'The cloud computer cannot start. Try again.',
        )
    }
  } catch (error) {
    if (!(error instanceof HttpError)) throw error
    job.failure = {
      code: error.code,
      message: error.message,
      status: error.status,
    }
  }
  const accepted = await controller.queueLifecycleStart(job)
  if (accepted)
    await nativeWorkspaceStorage(storage, {
      guarded: true,
      generation: () => generation,
    }).delete(CREATE_CHECKPOINT_KEY)
  return accepted
}
