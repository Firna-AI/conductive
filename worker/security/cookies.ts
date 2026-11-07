export const SESSION_COOKIE = '__Host-conductive-session'
export const OAUTH_COOKIE = '__Host-conductive-oauth'

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
