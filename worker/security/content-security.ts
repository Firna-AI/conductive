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
    `connect-src 'self' ${appOrigin} ${socketOrigin}`,
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ].join('; ')
}
