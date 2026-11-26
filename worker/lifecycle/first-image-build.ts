import { warnWorker } from '../warnings'
import { jobSoftware, type BuildJob } from './build-data'
import { startImageBuild, type ImageRuntime } from './image-builds'
import { firstActiveOrgAdmin } from './settings-data'
import { readOrgImage } from './org-image-data'
import { takeBuildRequest } from './build-request'

/**
 * Starts the build that follows a job that ended, at most one: the build
 * that an admin asked for during a refresh, else the added build. A
 * request whose admin can no longer start a build gives way to the added
 * build.
 */
export async function startFollowingBuild(
  runtime: ImageRuntime,
  job: BuildJob,
): Promise<void> {
  if (await startRequestedBuild(runtime, job)) return
  await startAddedImageBuild(runtime, job)
}

async function startRequestedBuild(
  runtime: ImageRuntime,
  job: BuildJob,
): Promise<boolean> {
  try {
    const userId = await takeBuildRequest(runtime.env.DB, job.buildId)
    if (!userId) return false
    await startImageBuild(runtime, {
      orgId: job.orgId,
      userId,
      kind: 'build',
      software: jobSoftware(job),
      requested: true,
    })
    return true
  } catch {
    warnWorker({ kind: 'requested_image_build_start_failed' })
    return false
  }
}

export async function startAddedImageBuild(
  runtime: ImageRuntime,
  job: BuildJob,
): Promise<void> {
  if (job.phase !== 'cleanup-build' || job.state !== 'succeeded') return
  try {
    const image = await readOrgImage(
      runtime.env.DB,
      job.orgId,
      job.providerAccount,
    )
    if (image?.imageBuildId !== job.buildId) return
    const admin = await firstActiveOrgAdmin(runtime.env.DB, job.orgId)
    if (!admin) return
    await startImageBuild(runtime, {
      orgId: job.orgId,
      userId: admin.userId,
      kind: 'build',
      software: jobSoftware(job),
    })
  } catch {
    warnWorker({ kind: 'added_image_build_start_failed' })
  }
}
