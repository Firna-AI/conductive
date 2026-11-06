/** The sole bundled renderer origin. Custom URL.origin is null in Node. */
export const DESKTOP_ORIGIN = 'conducting-app://desktop'
export const DESKTOP_SCHEME = 'conducting-app'
export const DESKTOP_CALLBACK = 'conducting://auth/github/callback'
export const DESKTOP_EXCHANGE_PATH = '/api/auth/desktop'
export const DESKTOP_SESSION_COOKIE = '__Host-conducting-desktop-session'

export function isDesktopAddress(url: URL): boolean {
  return (
    url.protocol === `${DESKTOP_SCHEME}:` &&
    url.host === 'desktop' &&
    !url.username &&
    !url.password
  )
}
