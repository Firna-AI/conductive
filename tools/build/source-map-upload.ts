export interface SourceMapUploadSettings {
  authToken: string
  url: string
  org: string
  workerProject: string
  browserProject: string
}

export function readSourceMapUploadSettings(
  release: string | undefined,
  settings: NodeJS.ProcessEnv,
): SourceMapUploadSettings | undefined {
  const authToken = settings.SENTRY_AUTH_TOKEN?.trim()
  const url = settings.SENTRY_URL?.trim()
  const org = settings.SENTRY_ORG?.trim()
  const workerProject = settings.SENTRY_WORKER_PROJECT?.trim()
  const browserProject = settings.SENTRY_BROWSER_PROJECT?.trim()
  if (
    !release ||
    !authToken ||
    !url ||
    !org ||
    !workerProject ||
    !browserProject
  )
    return undefined
  return { authToken, url, org, workerProject, browserProject }
}

export async function runSourceMapUpload(
  upload: () => Promise<void>,
  warn: (message: string) => void,
): Promise<void> {
  try {
    await upload()
  } catch {
    warn('Error-reporting source map upload failed. The build will continue.')
  }
}
