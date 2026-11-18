import { DEFAULT_PROVIDER_ACCOUNT } from '../sandbox/account-identity'
import type { ImageRuntime } from './image-builds'
import type { ImageSoftwareArtifact } from './image-software'
import { staleImageOrgs } from './org-image-refresh-data'

/**
 * Only the verified GitHub webhook dispatcher calls this entry point.
 *
 * A refresh copies each repository with the name and the default branch
 * that its image holds. After GitHub changes one of them, only a build
 * takes in the new values. This wakes the image coordinator of each org
 * whose image holds old values. The coordinator then starts the build, or
 * starts it after the job that runs. A failed wake records no build, and
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
  providerAccount = DEFAULT_PROVIDER_ACCOUNT,
): Promise<readonly string[]> {
  const orgIds = await staleImageOrgs(runtime.env.DB, input, providerAccount)
  if (orgIds.length === 0) return []
  const software = await input.software()
  let failure: { error: unknown } | undefined
  for (const orgId of orgIds) {
    // One org that cannot wake does not stop the other orgs.
    try {
      await runtime.scheduler.schedule(
        orgId,
        software,
        runtime.dependencies.now(),
        null,
        providerAccount,
      )
    } catch (error) {
      failure ??= { error }
    }
  }
  if (failure) throw failure.error
  return orgIds
}
