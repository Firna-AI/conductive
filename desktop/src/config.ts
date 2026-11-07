import { appContentSecurityPolicy } from '../../worker/security/content-security.ts'

export const DEFAULT_APP_ORIGIN = 'https://app.conductive.build'

export interface BuildConfig {
  appOrigin: string
  updates: 'unpublished' | 'enabled'
  frameSources: string[]
}

/** Packaged builds never use environment overrides or a remote renderer. */
export function readConfiguration(value: unknown): BuildConfig {
  if (typeof value !== 'object' || value === null || !('appOrigin' in value)) {
    throw new Error('Desktop build configuration is missing')
  }
  const appOrigin = value.appOrigin
  if (typeof appOrigin !== 'string')
    throw new Error('The app origin is missing')
  const url = new URL(appOrigin)
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if (
    url.origin !== appOrigin ||
    url.username ||
    url.password ||
    (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))
  )
    throw new Error('Use an HTTPS app origin or a local development origin')
  return {
    appOrigin,
    updates:
      'updates' in value && value.updates === 'enabled'
        ? 'enabled'
        : 'unpublished',
    frameSources:
      'frameSources' in value && Array.isArray(value.frameSources)
        ? value.frameSources.filter(
            (source): source is string =>
              typeof source === 'string' &&
              /^https:\/\/[A-Za-z0-9*.-]+(?::[0-9]+)?$/.test(source),
          )
        : [],
  }
}

export function contentSecurityPolicy(config: BuildConfig): string {
  return appContentSecurityPolicy(config.appOrigin, config.frameSources)
}
