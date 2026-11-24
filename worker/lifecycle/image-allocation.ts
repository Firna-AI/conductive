import type { AppEnv } from '../env'
import type { SandboxProvider } from '../sandbox/provider'
import { assignBuildSandbox, type BuildJob } from './build-data'
import { completeBuildPhase } from './build-phase-data'
import { buildSandboxIntent, createResource } from './resource-intents'
import { recoverResourceForCleanup } from './allocation-recovery'

export async function allocateImageBuild(
  env: AppEnv,
  provider: SandboxProvider,
  job: BuildJob,
  mayHaveAllocated: boolean,
  now: () => number,
): Promise<void> {
  if (job.sandboxId === null) {
    const sandbox = await createResource(
      env.DB,
      provider,
      await buildSandboxIntent(env, job, mayHaveAllocated),
    )
    await assignBuildSandbox(
      env.DB,
      job.buildId,
      sandbox.id,
      job.providerAccount,
    )
  }
  await completeBuildPhase(env.DB, job.buildId, 'sources', now())
}

export async function recoverImageBuildForCleanup(
  env: AppEnv,
  provider: SandboxProvider,
  job: BuildJob,
): Promise<string | null> {
  const sandbox = await recoverResourceForCleanup(
    env.DB,
    provider,
    await buildSandboxIntent(env, job, true),
  )
  if (sandbox === null) return null
  await assignBuildSandbox(env.DB, job.buildId, sandbox.id, job.providerAccount)
  return sandbox.id
}
