import type { ImageRuntime } from './image-builds'
import { scheduleIdleImage } from './image-schedule'
import type { ImageSoftwareArtifact } from './image-software'
import { staleImageOrgs } from './org-image-refresh-data'

/**
 * Only the verified GitHub webhook dispatcher calls this entry point.
 *
 * After GitHub changes the name or the default branch of a repository, a
 * build moves its folder to the new name. This wakes the image coordinator
 * of each org whose image holds old values and whose newest build
 * succeeded. The coordinator then starts the build, or starts it after the
 * job that runs. A failed wake records no build, and
 * the next alarm of the coordinator checks again.
 */
export async function wakeImagesForRepositoryChange(
  runtime: ImageRuntime,
  input: {
    githubRepositoryId: number
    installationId: number
    /** Read only when an org needs a build. */
    software: () => Promise<ImageSoftwareArtifact>
  },
): Promise<readonly string[]> {
  const orgIds = await staleImageOrgs(runtime.env.DB, input)
  if (orgIds.length === 0) return []
  const software = await input.software()
  let failure: { error: unknown } | undefined
  for (const orgId of orgIds) {
    // One org that cannot wake does not stop the other orgs.
    try {
      await scheduleIdleImage(runtime, orgId, software)
    } catch (error) {
      failure ??= { error }
    }
  }
  if (failure) throw failure.error
  return orgIds
}
