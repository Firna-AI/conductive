import type { AppEnv } from './env'
import {
  readImageSoftware,
  type ImageSoftwareArtifact,
} from './lifecycle/image-software'

export function runnerSoftware(
  env: Pick<
    AppEnv,
    'CONDUCTIVE_RUNNER_ARCHIVE_URL' | 'CONDUCTIVE_RUNNER_ARCHIVE_SHA256'
  >,
): ImageSoftwareArtifact {
  return readImageSoftware({
    url: env.CONDUCTIVE_RUNNER_ARCHIVE_URL,
    sha256: env.CONDUCTIVE_RUNNER_ARCHIVE_SHA256,
  })
}
