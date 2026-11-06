import type { SandboxProvider } from '../sandbox/provider'
import {
  jobSoftware,
  saveBuildOutput,
  updateBuildJob,
  writeBuildLog,
  type BuildJob,
  type BuildPhase,
} from './build-data'
import { writeFileCommand } from './commands'
import { installImageSoftware } from './image-software'
import { readImageSettings } from './settings-data'
import { imageIsLeased } from './image-leases'
import type { ImageRuntime } from './image-builds'
import { deleteSandboxIfPresent, deleteSnapshotIfPresent } from './cleanup'

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
      command = `set -eu\n${writeFileCommand('/tmp/conducting-install.sh', job.installScript)}\nsh /tmp/conducting-install.sh\nrm -f /tmp/conducting-install.sh`
    await writeBuildLog(
      runtime.env.DB,
      job.buildId,
      phaseLabel(job.phase),
      runtime.dependencies.now(),
    )
    const started = await provider.startCommand(sandboxId, command)
    await updateBuildJob(
      runtime.env.DB,
      job.buildId,
      job.phase,
      started.processId,
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
  const settings = await readImageSettings(runtime.env.DB, job.orgId)
  const pendingAt =
    settings.pendingPushRefreshAt === null
      ? Infinity
      : Math.max(
          settings.pendingPushRefreshAt,
          (settings.lastPushRefreshAt ?? -Infinity) + 1_800_000,
        )
  await runtime.scheduler.schedule(
    job.orgId,
    jobSoftware(job),
    Math.min(runtime.dependencies.now() + 86_400_000, pendingAt),
    null,
  )
  return true
}

function phaseLabel(phase: BuildPhase): string {
  return phase === 'sources'
    ? 'Updating the repositories.\n'
    : phase === 'software'
      ? 'Installing the cloud computer software.\n'
      : 'Running the install script.\n'
}
