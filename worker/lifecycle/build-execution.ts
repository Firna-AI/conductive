import { CommandFailed } from '../warnings'
import type { SandboxProvider } from '../sandbox/provider'
import { providerForAccount } from '../sandbox/client'
import {
  jobSoftware,
  saveBuildOutput,
  updateBuildJob,
  type BuildJob,
  type BuildPhase,
} from './build-data'
import { savedScriptCommand, serializeSavedScript } from './saved-script'
import { installImageSoftware } from './image-software'
import { imageIsLeased } from './image-leases'
import { scheduleIdleImage } from './image-schedule'
import type { ImageRuntime } from './image-builds'
import { deleteSandboxIfPresent, deleteSnapshotIfPresent } from './cleanup'
import { cleanupBuildImageSources } from './image-sources/cleanup'
import { lifecycleCommand } from './command-intents'
import { recordBuildCommand } from './build-command-data'
import { completeBuildPhase } from './build-phase-data'
import { installWorkspaceTools } from '../tools/image'
import { WORKSPACE_TOOL_SOURCES } from '../tools/image-assets'
import { privilegedCommand } from '../terminal/privileged'
import { recoverImageBuildAllocation } from './image-allocation'
import { liveBuildComputers } from './computer-ledger'
import { startAddedImageBuild } from './first-image-build'
import { imageIsPublished } from './org-image-data'

export async function advanceBuildCommand(
  runtime: ImageRuntime,
  provider: SandboxProvider,
  job: BuildJob,
): Promise<boolean> {
  const sandboxId = job.sandboxId
  if (!sandboxId) throw new Error('Missing build sandbox')
  if (job.processId === null) {
    if (
      job.phase === 'install' &&
      serializeSavedScript(job.installScript) === ''
    ) {
      await completeBuildPhase(runtime.env.DB, job.buildId, 'snapshot')
      return false
    }
    if (job.phase === 'software')
      await installWorkspaceTools(WORKSPACE_TOOL_SOURCES, (command) =>
        provider.runCommand(sandboxId, privilegedCommand(command)),
      )
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
    throw new CommandFailed(
      status.state,
      status.exitCode,
      status.timedOut === true,
    )
  const next: BuildPhase = job.phase === 'software' ? 'install' : 'snapshot'
  await completeBuildPhase(runtime.env.DB, job.buildId, next)
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
  if (job.phase === 'allocating') {
    job = {
      ...job,
      sandboxId:
        job.sandboxId ??
        (await recoverImageBuildAllocation(runtime.env.DB, provider, job)),
    }
    await updateBuildJob(runtime.env.DB, job.buildId, 'cleanup')
  }
  const failures: unknown[] = []
  for (const computer of await liveBuildComputers(
    runtime.env.DB,
    job.orgId,
    job.buildId,
  )) {
    try {
      await deleteSandboxIfPresent(
        runtime.env.DB,
        providerForAccount(
          runtime.env,
          runtime.dependencies.fetch,
          computer.providerAccount,
        ),
        computer,
        runtime.dependencies.now(),
      )
    } catch (error) {
      failures.push(error)
    }
  }
  if (failures.length > 0) throw failures[0]
  if (job.sandboxId) {
    await runtime.env.DB.prepare(
      'UPDATE image_builds SET sandbox_id = NULL WHERE id = ? AND org_id = ? AND sandbox_id = ? AND provider_account = ?',
    )
      .bind(job.buildId, job.orgId, job.sandboxId, job.providerAccount)
      .run()
  }
  if (
    job.state === 'failed' &&
    job.snapshotName &&
    (job.snapshotName !== job.previousImageName ||
      job.providerAccount !== job.previousProviderAccount)
  )
    await deleteSnapshotIfPresent(provider, job.snapshotName)
  // Keep build metadata and logs. Only the current image needs a snapshot.
  if (
    job.state === 'succeeded' &&
    job.previousImageName &&
    (job.previousImageName !== job.snapshotName ||
      job.previousProviderAccount !== job.providerAccount)
  ) {
    const published = await imageIsPublished(
      runtime.env.DB,
      job.previousImageName,
      job.previousProviderAccount,
    )
    if (!published) {
      if (
        await imageIsLeased(
          runtime.env.DB,
          job.orgId,
          job.previousImageName,
          job.previousProviderAccount,
        )
      )
        return false
      await deleteSnapshotIfPresent(
        providerForAccount(
          runtime.env,
          runtime.dependencies.fetch,
          job.previousProviderAccount,
        ),
        job.previousImageName,
      )
    }
  }
  await updateBuildJob(runtime.env.DB, job.buildId, 'done')
  await startAddedImageBuild(runtime, job)
  await scheduleIdleImage(
    runtime,
    job.orgId,
    jobSoftware(job),
    job.providerAccount,
  )
  return true
}

function phaseLabel(phase: BuildPhase): string {
  return phase === 'sources'
    ? 'Updating the repositories.\n'
    : phase === 'software'
      ? 'Installing the agent and terminal software.\n'
      : 'Running the install script.\n'
}
