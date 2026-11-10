import { warnWorker } from '../warnings'
import { jobSoftware, type BuildJob } from './build-data'
import { startImageBuild, type ImageRuntime } from './image-builds'
import { firstActiveOrgAdmin } from './settings-data'
import { readOrgImage } from './org-image-data'

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
    await startImageBuild(
      runtime,
      {
        orgId: job.orgId,
        userId: admin.userId,
        kind: 'build',
        software: jobSoftware(job),
      },
      job.providerAccount,
    )
  } catch {
    warnWorker('Could not start the added cloud computer build.')
  }
}
