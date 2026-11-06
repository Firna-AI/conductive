import type { AppEnv } from '../env'
import type { SandboxProvider } from '../sandbox/provider'
import type { WorkspaceRow } from './workspace-data'
import { allocateWorkspace } from './start-allocation'
import { releaseImageLease } from './image-leases'
import {
  recordRunningEnvironment,
  runningEnvironment,
} from './start-environment'
import { repositoryDirectory } from './commands'
import { workspaceEnvironment } from './settings-data'
import { readWorkspaceToken } from './tokens'
import { WorkspaceStartError } from './workspace-start'
import type { WorkspaceLifecycleEndpoint } from './workspace-runtime'
import type { WorkspaceStartJob, StartJobStorage } from './start-types'

export async function advanceStartMachine(
  env: AppEnv,
  endpoint: WorkspaceLifecycleEndpoint,
  provider: SandboxProvider,
  row: WorkspaceRow,
  job: WorkspaceStartJob,
  storage: StartJobStorage,
): Promise<{
  phase: WorkspaceStartJob['phase']
  environmentCiphertext: string | null
} | null> {
  if (job.phase === 'machine') {
    const environment = await workspaceEnvironment(
      env,
      job.orgId,
      job.environmentCiphertext,
    )
    const token = await readWorkspaceToken(env, job.workspaceId)
    const runtimeEnv = {
      ...environment,
      WORKSPACE_TOKEN: token,
      CONDUCTING_WORKSPACE_ID: job.workspaceId,
      CONDUCTING_MACHINE_ORIGIN: env.MACHINE_ORIGIN ?? '',
      CONDUCTING_REPOSITORY_DIR: repositoryDirectory(row.repositoryId),
      CONDUCTING_TURN_ID: '',
      CONDUCTING_DISK_KEEPALIVE: '0',
    }
    await endpoint.lifecycleStep(
      job.kind === 'create' ? 'image' : 'disk',
      job.kind === 'create'
        ? 'Starting from the newest image'
        : 'Resuming with your files as you left them',
      'running',
    )
    if (!row.sandboxId) {
      await recordRunningEnvironment(
        env.DB,
        job.workspaceId,
        job.environmentCiphertext,
      )
      const sandboxId = await allocateWorkspace(
        env,
        provider,
        storage,
        job,
        async () => ({
          snapshotName: job.imageName ?? undefined,
          name: row.id,
          env: runtimeEnv,
          ttlSeconds: 1_800,
          idempotencyKey: job.attempt,
          labels: {
            user: row.ownerUserId,
            repository: row.repositoryId,
            workspace: row.id,
            org: row.orgId,
          },
        }),
      )
      if (!sandboxId) return null
    } else if (job.kind === 'resume') {
      job.allocatedSandboxId = row.sandboxId
      await storage.update(job)
      const current = await provider.get(row.sandboxId)
      if (
        !['ready', 'idle', 'running', 'archived', 'cancelled'].includes(
          current.state,
        )
      ) {
        if (current.state === 'error') throw new WorkspaceStartError(null)
        return null
      }
      if (current.state === 'archived' || current.state === 'cancelled') {
        await recordRunningEnvironment(
          env.DB,
          job.workspaceId,
          job.environmentCiphertext,
        )
        await provider.resume(row.sandboxId, runtimeEnv, 1_800)
      }
    }
    return {
      phase: 'ready',
      environmentCiphertext:
        job.kind === 'resume'
          ? await runningEnvironment(env.DB, job.workspaceId)
          : job.environmentCiphertext,
    }
  }
  if (!row.sandboxId) throw new WorkspaceStartError(null)
  if (job.phase === 'ready') {
    const machine = await provider.get(row.sandboxId)
    if (['archived', 'error', 'cancelled'].includes(machine.state)) {
      if (job.kind === 'resume' && machine.state !== 'error')
        return {
          phase: 'machine',
          environmentCiphertext: job.environmentCiphertext,
        }
      throw new WorkspaceStartError(null)
    }
    if (!['ready', 'idle', 'running'].includes(machine.state)) return null
    await provider.setAutoStop(row.sandboxId, 1_800)
    if (job.kind === 'create')
      await releaseImageLease(env.DB, job.orgId, job.workspaceId)
    await endpoint.lifecycleStep(
      job.kind === 'create' ? 'image' : 'disk',
      job.kind === 'create'
        ? 'Starting from the newest image'
        : 'Resuming with your files as you left them',
      'completed',
    )
    return {
      phase: job.kind === 'create' ? 'fetch' : 'startup',
      environmentCiphertext: job.environmentCiphertext,
    }
  }
  return null
}
