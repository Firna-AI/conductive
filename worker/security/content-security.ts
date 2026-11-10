/** One policy serves web assets and the desktop's bundled web assets. */
export function appContentSecurityPolicy(
  appOrigin: string,
  frameSources: readonly string[] = [],
): string {
  const socketOrigin = appOrigin.replace(/^http/, 'ws')
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://avatars.githubusercontent.com",
    "font-src 'self'",
    `frame-src 'self' ${frameSources.join(' ')}`.trim(),
    `connect-src 'self' ${appOrigin} ${socketOrigin}${BROWSER_ERROR_TRACKING_ORIGIN ? ` ${BROWSER_ERROR_TRACKING_ORIGIN}` : ''}`,
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ].join('; ')
}
import { BROWSER_ERROR_TRACKING_ORIGIN } from '../../src/shared/error-reporting.ts'
