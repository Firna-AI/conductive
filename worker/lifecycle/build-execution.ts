import type { SandboxProvider } from '../sandbox/provider'
import {
  jobSoftware,
  saveBuildOutput,
  updateBuildJob,
  type BuildJob,
  type BuildPhase,
} from './build-data'
import { savedScriptCommand } from './saved-script'
import { installImageSoftware } from './image-software'
import { imageIsLeased } from './image-leases'
import { scheduleIdleImage } from './image-schedule'
import type { ImageRuntime } from './image-builds'
import { deleteSandboxIfPresent, deleteSnapshotIfPresent } from './cleanup'
import { cleanupBuildImageSources } from './image-sources/cleanup'
import { lifecycleCommand } from './command-intents'
import { recordBuildCommand } from './build-command-data'

export async function advanceBuildCommand(
  runtime: ImageRuntime,
  provider: SandboxProvider,
  job: BuildJob,
): Promise<boolean> {
  const sandboxId = job.sandboxId
  if (!sandboxId) throw new Error('Missing build sandbox')
  if (job.processId === null) {
    let command: string
    if (job.phase === 'software')
      command = installImageSoftware(jobSoftware(job))
    else
      command = `set -eu\n${savedScriptCommand('/tmp/conductive-install.sh', job.installScript, ['set -a', '. /run/ascii-secrets/env.sh', 'set +a'])}\nrm -f /tmp/conductive-install.sh`
    if (job.phase !== 'software' && job.phase !== 'install')
      throw new Error('Invalid image command phase')
    const started = await provider.startCommand(
      sandboxId,
      lifecycleCommand({ kind: 'build', id: job.buildId }, job.phase, command),
    )
    await recordBuildCommand(
      runtime.env.DB,
      job.buildId,
      started.processId,
      phaseLabel(job.phase),
      runtime.dependencies.now(),
    )
    return false
  }
  const status = await provider.getCommandStatus(sandboxId, job.processId, {
    stdoutOffset: job.stdoutOffset,
    stderrOffset: job.stderrOffset,
  })
  await saveBuildOutput(
    runtime.env.DB,
    job.buildId,
    status,
    runtime.dependencies.now(),
  )
  if (status.more || status.running) return false
  if (status.state !== 'exited' || status.exitCode !== 0 || status.timedOut)
    throw new Error('Image command failed')
  const next: BuildPhase = job.phase === 'software' ? 'install' : 'snapshot'
  await updateBuildJob(runtime.env.DB, job.buildId, next)
  return false
}

export async function cleanupBuild(
  runtime: ImageRuntime,
  provider: SandboxProvider,
  job: BuildJob,
): Promise<boolean> {
  if (
    !(await cleanupBuildImageSources(
      runtime.env,
      runtime.dependencies.fetch,
      job.buildId,
    ))
  )
    return false
  if (job.sandboxId) {
    await deleteSandboxIfPresent(provider, job.sandboxId)
    await runtime.env.DB.prepare(
      'UPDATE image_builds SET sandbox_id = NULL WHERE id = ?',
    )
      .bind(job.buildId)
      .run()
  }
  if (
    job.state === 'failed' &&
    job.snapshotName &&
    job.snapshotName !== job.previousImageName
  )
    await deleteSnapshotIfPresent(provider, job.snapshotName)
  // Keep build metadata and logs. Only the current image needs a snapshot.
  if (
    job.state === 'succeeded' &&
    job.previousImageName &&
    job.previousImageName !== job.snapshotName
  ) {
    if (await imageIsLeased(runtime.env.DB, job.orgId, job.previousImageName))
      return false
    await deleteSnapshotIfPresent(provider, job.previousImageName)
  }
  await updateBuildJob(runtime.env.DB, job.buildId, 'done')
  await scheduleIdleImage(runtime, job.orgId, jobSoftware(job))
  return true
}

function phaseLabel(phase: BuildPhase): string {
  return phase === 'sources'
    ? 'Updating the repositories.\n'
    : phase === 'software'
      ? 'Installing the cloud computer software.\n'
      : 'Running the install script.\n'
}
