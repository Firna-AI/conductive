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

export function appFrameSources(
  env: Pick<AppEnv, 'PREVIEW_DOMAIN' | 'CONDUCTIVE_FRAME_SOURCES'>,
): string[] {
  const configured = (env.CONDUCTIVE_FRAME_SOURCES ?? '')
    .split(/\s+/)
    .filter((source) => /^https:\/\/[A-Za-z0-9*.-]+(?::[0-9]+)?$/.test(source))
  return [
    ...new Set([
      ...(env.PREVIEW_DOMAIN ? [`https://*.${env.PREVIEW_DOMAIN}`] : []),
      ...configured,
    ]),
  ]
}
