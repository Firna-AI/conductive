import { providerState } from './provider-state'
import type { AppEnv } from '../env'
import type { SandboxProvider } from '../sandbox/provider'
import { encrypt } from '../security/crypto'
import type { WorkspaceRow } from './workspace-data'
import { allocateWorkspace } from './start-allocation'
import { releaseImageLease } from './image-leases'
import {
  recordRunningEnvironment,
  runningEnvironment,
} from './start-environment'
import {
  repositoryEnvironment,
  repositoryLocation,
} from './repository-locations'
import { workspaceRepositoryLocations } from './repository-location-data'
import { orgEnvironmentContext, workspaceEnvironment } from './settings-data'
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
    // A pinned create retries the same runtime settings.
    if (!job.createPayloadCiphertext) {
      environment.CONDUCTIVE_COMPUTER_MCP_URL =
        env.CONDUCTIVE_COMPUTER_MCP_URL ?? ''
      job.environmentCiphertext = await encrypt(
        JSON.stringify(environment),
        orgEnvironmentContext(job.orgId),
        env.BOAT_KEY_ENCRYPTION_KEY,
      )
      await storage.update(job)
    }
    const token = await readWorkspaceToken(env, job.workspaceId)
    const locations =
      job.repositoryLocations ??
      (await workspaceRepositoryLocations(env.DB, job.workspaceId))
    job.repositoryLocations = locations
    const runtimeEnv = {
      ...environment,
      ...repositoryEnvironment(locations),
      WORKSPACE_TOKEN: token,
      CONDUCTIVE_WORKSPACE_ID: job.workspaceId,
      CONDUCTIVE_MACHINE_ORIGIN: env.MACHINE_ORIGIN ?? '',
      CONDUCTIVE_DEFAULT_BRANCH: job.defaultBranch,
      CONDUCTIVE_REPOSITORY_DIR: repositoryLocation(
        locations,
        row.repositoryId,
      ),
      CONDUCTIVE_TURN_ID: '',
      CONDUCTIVE_DISK_KEEPALIVE: '0',
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
      const status = providerState(current.state)
      if (status === 'error') throw new WorkspaceStartError(null)
      if (status === 'starting' || status === 'stopping') return null
      if (status === 'stopped') {
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
      environmentCiphertext: await runningEnvironment(env.DB, job.workspaceId),
    }
  }
  if (!row.sandboxId) throw new WorkspaceStartError(null)
  if (job.phase === 'ready') {
    const machine = await provider.get(row.sandboxId)
    const status = providerState(machine.state)
    if (status === 'stopped' && job.kind === 'resume')
      return {
        phase: 'machine',
        environmentCiphertext: job.environmentCiphertext,
      }
    if (status === 'stopped' || status === 'error')
      throw new WorkspaceStartError(null)
    if (status !== 'ready') return null
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
