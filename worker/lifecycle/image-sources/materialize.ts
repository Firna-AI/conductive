import type { AppDependencies, AppEnv } from '../../env'
import { HttpError } from '../../http'
import type { PrepareImageSources } from '../image-builds'
import {
  completeSourceCommand,
  initializeSourceCommand,
  SourceFileWriter,
  pruneSourcesCommand,
  runBuilderCommand,
} from './builder'
import { authorizeImageBuilder, readSourceRepository } from './data'
import { withSourceDeadline } from './deadline'
import { appSigningKey, installationToken } from './github-app'
import { gitRequest, repositoryUrl } from './git-http'
import { transferPack } from './pack'
import { readDefaultRef } from './refs'
import { tagRecord } from './tags'

/** GitHub credentials remain in Worker headers. The builder receives only Git data. */
export function createGitHubImageSourceMaterializer(
  env: AppEnv & { GITHUB_APP_PRIVATE_KEY?: string },
  dependencies: Pick<AppDependencies, 'fetch'>,
): PrepareImageSources {
  return async ({ orgId, buildId, sandboxId, repositories, provider }) => {
    let missingKey = false
    try {
      await authorizeImageBuilder(env.DB, orgId, buildId, sandboxId)
      const sources = await Promise.all(
        repositories.map((repository) =>
          readSourceRepository(env.DB, orgId, repository),
        ),
      )
      if (sources.length && !env.GITHUB_APP_PRIVATE_KEY) {
        missingKey = true
        throw new Error('Missing App private key')
      }
      const key =
        sources.length && env.GITHUB_APP_PRIVATE_KEY
          ? await appSigningKey(env.GITHUB_APP_PRIVATE_KEY)
          : null
      await withSourceDeadline(provider, sandboxId, async () => {
        await runBuilderCommand(
          provider,
          sandboxId,
          pruneSourcesCommand(sources),
        )
        for (const repository of sources) {
          if (!key) throw new Error('Missing App signing key')
          const url = repositoryUrl(repository.fullName)
          const token = await installationToken(
            dependencies.fetch,
            env.GITHUB_CLIENT_ID,
            key,
            repository,
          )
          const advertisement = await gitRequest(
            dependencies.fetch,
            `${url}/info/refs?service=git-upload-pack`,
            token,
          )
          const tags = new SourceFileWriter(
            provider,
            sandboxId,
            repository,
            'tags',
          )
          const ref = await readDefaultRef(
            advertisement,
            repository.defaultBranch,
            {
              initialize: (objectFormat) =>
                runBuilderCommand(
                  provider,
                  sandboxId,
                  initializeSourceCommand(repository, url, { objectFormat }),
                ),
              tag: (oid, name) => tags.write(tagRecord(oid, name)),
            },
          )
          await tags.flush()
          if (ref.oid) {
            const writer = new SourceFileWriter(
              provider,
              sandboxId,
              repository,
              'pack',
            )
            await transferPack(dependencies.fetch, url, token, ref, (bytes) =>
              writer.write(bytes),
            )
            await writer.flush()
          }
          await runBuilderCommand(
            provider,
            sandboxId,
            completeSourceCommand(repository, ref),
          )
        }
      })
    } catch {
      // Provider output, Git progress, and HTTP failures can contain credentials.
      throw new HttpError(
        missingKey ? 503 : 502,
        'image_sources_unavailable',
        missingKey
          ? 'The repositories could not load. Ask the app operator to set the GitHub App private key.'
          : 'The repositories could not load. Check the GitHub App access and try again.',
      )
    }
  }
}
