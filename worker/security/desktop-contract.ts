/** The sole bundled renderer origin. Custom URL.origin is null in Node. */
export const DESKTOP_ORIGIN = 'conductive-app://desktop'
export const DESKTOP_SCHEME = 'conductive-app'
export const DESKTOP_CALLBACK = 'conductive://auth/github/callback'
export const DESKTOP_EXCHANGE_PATH = '/api/auth/desktop'
export const DESKTOP_SESSION_COOKIE = '__Host-conductive-desktop-session'

export function desktopSessionCookie(value: string, seconds: number): string {
  return `${DESKTOP_SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${seconds}`
}

export function isDesktopAddress(url: URL): boolean {
  return (
    url.protocol === `${DESKTOP_SCHEME}:` &&
    url.host === 'desktop' &&
    !url.username &&
    !url.password
  )
}
