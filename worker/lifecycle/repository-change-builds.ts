import { DEFAULT_PROVIDER_ACCOUNT } from '../sandbox/account-identity'
import { startImageBuild, type ImageRuntime } from './image-builds'
import type { ImageSoftwareArtifact } from './image-software'
import { changedImageRepositoryOrgs } from './org-image-refresh-data'
import { firstActiveOrgAdmin } from './settings-data'

/**
 * Only the verified GitHub webhook dispatcher calls this entry point.
 *
 * A refresh copies each repository with the name and the default branch
 * that its image holds. After GitHub changes one of them, only a build
 * takes in the new values. So each org whose image holds old values gets
 * a build at once, for an admin who is not suspended.
 */
export async function buildImagesForRepositoryChange(
  runtime: ImageRuntime,
  input: {
    githubRepositoryId: number
    installationId: number
    /** Read only when an org needs a build. */
    software: () => Promise<ImageSoftwareArtifact>
  },
  providerAccount = DEFAULT_PROVIDER_ACCOUNT,
): Promise<readonly string[]> {
  const orgIds = await changedImageRepositoryOrgs(
    runtime.env.DB,
    input,
    providerAccount,
  )
  if (orgIds.length === 0) return []
  const software = await input.software()
  const builds: string[] = []
  let failure: { error: unknown } | undefined
  for (const orgId of orgIds) {
    const admin = await firstActiveOrgAdmin(runtime.env.DB, orgId)
    if (!admin) continue
    // One org that cannot start its build does not stop the other orgs.
    try {
      builds.push(
        await startImageBuild(
          runtime,
          {
            orgId,
            userId: admin.userId,
            kind: 'build',
            software,
          },
          providerAccount,
        ),
      )
    } catch (error) {
      failure ??= { error }
    }
  }
  if (failure) throw failure.error
  return builds
}
