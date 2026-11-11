export const SESSION_COOKIE = '__Host-conductive-session'
export const OAUTH_COOKIE = '__Host-conductive-oauth'
/**
 * The screen where a browser started an install or a change of the GitHub
 * App, which the return from GitHub opens again.
 */
export const GITHUB_RETURN_COOKIE = '__Host-conductive-github-return'
export const GITHUB_RELAY_COOKIE = '__Secure-conductive-github-relay'

export function readCookie(request: Request, name: string): string | null {
  const values = (request.headers.get('Cookie') ?? '')
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${name}=`))
  return values.length === 1 ? values[0].slice(name.length + 1) : null
}

export function cookie(name: string, value: string, maxAge: number): string {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`
}

export function domainCookie(
  name: string,
  value: string,
  maxAge: number,
  domain: string,
  path: string,
): string {
  return `${name}=${value}; Domain=${domain}; Path=${path}; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`
}
