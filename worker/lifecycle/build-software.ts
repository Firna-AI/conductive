import type { BuildJob } from './build-data'
import type { ImageRuntime } from './image-builds'
import { imagePackagesVersion } from './image-packages'
import { installImageSoftware } from './image-software'
import { latestSoftwareRelease } from './software-release'

/** The saved image that a build sandbox starts from, or null for the base image. */
export type BuildSource = { kind: 'org' | 'software'; name: string } | null

type SourceFields = Pick<
  BuildJob,
  | 'previousImageName'
  | 'previousProviderAccount'
  | 'providerAccount'
  | 'softwareImageName'
>

/** A build starts from the last org image of its account, else from the pinned software image. */
export function buildSource(job: SourceFields): BuildSource {
  if (
    job.previousImageName &&
    job.previousProviderAccount === job.providerAccount
  )
    return { kind: 'org', name: job.previousImageName }
  if (job.softwareImageName)
    return { kind: 'software', name: job.softwareImageName }
  return null
}

/**
 * The version of the apt part that the source image of a build holds.
 * Null means the base image, or an image from before the version was kept.
 */
async function sourcePackagesVersion(
  db: D1Database,
  job: SourceFields & Pick<BuildJob, 'orgId'>,
): Promise<string | null> {
  const source = buildSource(job)
  if (!source) return null
  const row =
    source.kind === 'org'
      ? await db
          .prepare(
            `SELECT j.packages_version AS version FROM image_builds b
             JOIN image_build_jobs j ON j.build_id = b.id
             WHERE b.org_id = ? AND b.provider_account = ? AND b.snapshot_name = ?
               AND b.state = 'succeeded'
             ORDER BY b.started_at DESC, b.id DESC LIMIT 1`,
          )
          .bind(job.orgId, job.providerAccount, source.name)
          .first<{ version: string | null }>()
      : await db
          .prepare(
            `SELECT packages_version AS version FROM software_images
             WHERE provider_account = ? AND snapshot_name = ?`,
          )
          .bind(job.providerAccount, source.name)
          .first<{ version: string | null }>()
  return row?.version ?? null
}

/**
 * The software step of an org build or refresh. The step skips the apt part
 * when the source image holds the current apt part and every package. The
 * build records the returned version, which its own image then holds.
 */
export async function buildSoftwareCommand(
  runtime: ImageRuntime,
  job: BuildJob,
): Promise<{ command: string; packagesVersion: string }> {
  const [release, packagesVersion, held] = await Promise.all([
    latestSoftwareRelease(runtime.env, runtime.dependencies.fetch),
    imagePackagesVersion(),
    sourcePackagesVersion(runtime.env.DB, job),
  ])
  return {
    command: installImageSoftware(
      release,
      held === packagesVersion ? 'when-missing' : 'install',
    ),
    packagesVersion,
  }
}
