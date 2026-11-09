import { warnWorker } from '../warnings'
import { jobSoftware, type BuildJob } from './build-data'
import { startImageBuild, type ImageRuntime } from './image-builds'
import { firstActiveOrgAdmin, readImageSettings } from './settings-data'

export async function startAddedImageBuild(
  runtime: ImageRuntime,
  job: BuildJob,
): Promise<void> {
  if (job.phase !== 'cleanup-build' || job.state !== 'succeeded') return
  try {
    const settings = await readImageSettings(runtime.env.DB, job.orgId)
    if (settings.imageBuildId !== job.buildId) return
    const admin = await firstActiveOrgAdmin(runtime.env.DB, job.orgId)
    if (!admin) return
    await startImageBuild(runtime, {
      orgId: job.orgId,
      userId: admin.userId,
      kind: 'build',
      software: jobSoftware(job),
    })
  } catch {
    warnWorker('Could not start the added cloud computer build.')
  }
}
