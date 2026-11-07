import type { AppEnv } from '../env'

export function appOrigin(
  request: Request,
  env: Pick<AppEnv, 'APP_ORIGIN' | 'MACHINE_ORIGIN' | 'MARKETING_ORIGIN'>,
): string {
  const url = new URL(request.url)
  if (url.origin === env.MACHINE_ORIGIN || url.origin === env.MARKETING_ORIGIN)
    return env.APP_ORIGIN
  const local =
    url.protocol === 'http:' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  return local ? url.origin : env.APP_ORIGIN
}
