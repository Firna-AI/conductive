import { DESKTOP_ORIGIN } from '../../worker/security/desktop-contract.js'
import {
  isPreviewLaunchPath,
  PREVIEW_HANDOFF_PATH,
} from '../../worker/security/preview-launch-path.js'

export interface PreviewDependencies {
  appOrigin: string
  frameSources: readonly string[]
  fetch(request: Request): Promise<Response>
  external(url: string): Promise<unknown>
}

export async function openPreviewInBrowser(
  launcher: string,
  dependencies: PreviewDependencies,
): Promise<void> {
  const source = new URL(launcher)
  if (
    source.origin !== dependencies.appOrigin ||
    !isPreviewLaunchPath(source.pathname)
  )
    throw new Error('Invalid preview launcher')
  const response = await dependencies.fetch(
    new Request(source, {
      headers: { Origin: DESKTOP_ORIGIN, Accept: 'application/json' },
      credentials: 'include',
      redirect: 'error',
    }),
  )
  if (!response.ok) throw new Error('Preview launch failed')
  const value: unknown = await response.json()
  if (
    !value ||
    typeof value !== 'object' ||
    !('url' in value) ||
    typeof value.url !== 'string' ||
    !('expiresAt' in value) ||
    typeof value.expiresAt !== 'number' ||
    !Number.isFinite(value.expiresAt)
  )
    throw new Error('Invalid preview handoff')
  const target = new URL(value.url)
  const domain = target.hostname.startsWith('authorize.')
    ? target.hostname.slice(10)
    : ''
  const fields = new URLSearchParams(target.hash.slice(1))
  const allowed =
    dependencies.frameSources.includes(target.origin) ||
    dependencies.frameSources.includes(
      `https://*.${domain}${target.port ? ':' + target.port : ''}`,
    )
  const hostname = fields.get('hostname') ?? ''
  if (
    !domain ||
    !allowed ||
    target.protocol !== 'https:' ||
    target.username ||
    target.password ||
    target.pathname !== PREVIEW_HANDOFF_PATH ||
    target.search ||
    fields.getAll('grant').length !== 1 ||
    !fields.get('grant') ||
    fields.getAll('hostname').length !== 1 ||
    !hostname.endsWith(`.${domain}`) ||
    !/^[a-f0-9]{32}$/.test(hostname.slice(0, -(domain.length + 1)))
  )
    throw new Error('Invalid preview handoff')
  await dependencies.external(target.href)
}
