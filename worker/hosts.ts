import { productDomain } from '../docs/mockups/src/brand'
import { siteResponse } from './marketing/site'
import type { AppEnv } from './env'
import { HttpError } from './http'
import { appOrigin } from './security/app-origin'

export type HostSurface = 'marketing' | 'app' | 'machine' | 'preview'

/** Machine and preview hosts use the configured deployment settings. */
export function hostSurface(request: Request, env: AppEnv): HostSurface {
  const url = new URL(request.url)
  if (url.origin === appOrigin(request, env)) return 'app'
  if (url.origin === (env.MARKETING_ORIGIN ?? `https://${productDomain}`))
    return 'marketing'
  if (env.MACHINE_ORIGIN && url.origin === env.MACHINE_ORIGIN) return 'machine'
  const previewSuffix = env.PREVIEW_DOMAIN ? `.${env.PREVIEW_DOMAIN}` : null
  if (previewSuffix && url.hostname.endsWith(previewSuffix)) {
    const label = url.hostname.slice(0, -previewSuffix.length)
    if (label && !label.includes('.')) return 'preview'
  }
  throw new HttpError(403, 'origin_forbidden', 'Open the app to continue.')
}

/** These stubs serve no user data and open no upstream connection. */
export function hostStub(surface: HostSurface): Response {
  if (surface === 'preview') {
    return Response.json(
      {
        error: { code: 'not_found', message: 'The preview is not available.' },
      },
      { status: 404 },
    )
  }
  return Response.json({ surface, status: 'not-implemented' }, { status: 501 })
}

/** Serve the marketing site with the current app origin and page labels. */
export function marketingResponse(
  request: Request,
  env: Pick<AppEnv, 'APP_ORIGIN' | 'ASSETS'>,
  now: number,
  readStartLabel?: () => Promise<string>,
): Promise<Response> {
  return siteResponse(
    request,
    { appOrigin: env.APP_ORIGIN, assets: env.ASSETS, readStartLabel },
    now,
  )
}
