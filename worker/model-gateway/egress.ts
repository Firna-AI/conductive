import type { AppEnv, HttpFetch } from '../env'

/** The shared secret that the ChatGPT egress proxy checks. */
export const EGRESS_SECRET_HEADER = 'x-conductive-egress-secret'
/** The ChatGPT origin that the egress proxy calls for the request. */
export const EGRESS_ORIGIN_HEADER = 'x-conductive-egress-origin'

type EgressEnv = Pick<
  AppEnv,
  'CHATGPT_EGRESS' | 'CHATGPT_EGRESS_URL' | 'CHATGPT_EGRESS_SECRET'
>

/** Sends one chatgpt.com request on the egress path. */
type EgressRoute = (target: URL, request: Request) => Promise<Response>

function chatGptHost(hostname: string): boolean {
  return hostname === 'chatgpt.com' || hostname.endsWith('.chatgpt.com')
}

function forwarded(
  url: string,
  request: Request,
  origin: string,
  secret?: string,
): Request {
  const headers = new Headers(request.headers)
  if (secret) headers.set(EGRESS_SECRET_HEADER, secret)
  headers.set(EGRESS_ORIGIN_HEADER, origin)
  const init = {
    method: request.method,
    headers,
    body: request.body,
    duplex: 'half',
    redirect: request.redirect,
    signal: request.signal,
  }
  return new Request(url, init)
}

function proxyRoute(env: EgressEnv, direct: HttpFetch): EgressRoute | null {
  const proxy = env.CHATGPT_EGRESS_URL?.trim()
  const secret = env.CHATGPT_EGRESS_SECRET?.trim()
  if (!proxy || !secret) return null
  let base: URL
  try {
    base = new URL(proxy)
  } catch {
    console.warn('CHATGPT_EGRESS_URL is not a valid URL. Direct path kept.')
    return null
  }
  if (base.protocol !== 'https:') {
    console.warn('CHATGPT_EGRESS_URL must use https. Direct path kept.')
    return null
  }
  return (target, request) =>
    direct(
      forwarded(
        `${base.origin}${target.pathname}${target.search}`,
        request,
        target.origin,
        secret,
      ),
    )
}

function egressRoute(env: EgressEnv, direct: HttpFetch): EgressRoute | null {
  const binding = env.CHATGPT_EGRESS
  if (!binding) return proxyRoute(env, direct)
  // The egress container has no public address, so it needs no secret.
  return (target, request) =>
    binding.fetch(
      forwarded(
        `https://chatgpt-egress.internal${target.pathname}${target.search}`,
        request,
        target.origin,
      ),
    )
}

/**
 * OpenAI refuses the chatgpt.com requests that a Cloudflare Worker sends.
 * Each such request goes through the egress container when the deployment
 * binds it, or else through the egress proxy that the settings name. Every
 * other request keeps the direct path.
 */
export function chatGptEgress<T extends { fetch: HttpFetch }>(
  env: EgressEnv,
  dependencies: T,
): T {
  const direct = dependencies.fetch
  const route = egressRoute(env, direct)
  if (!route) return dependencies
  return {
    ...dependencies,
    fetch: (request) => {
      const target = new URL(request.url)
      return target.protocol === 'https:' && chatGptHost(target.hostname)
        ? route(target, request)
        : direct(request)
    },
  }
}
