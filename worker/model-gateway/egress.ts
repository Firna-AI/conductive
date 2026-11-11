import type { AppEnv, HttpFetch } from '../env'

/** The shared secret that the ChatGPT egress proxy checks. */
export const EGRESS_SECRET_HEADER = 'x-conductive-egress-secret'
/** The ChatGPT origin that the egress proxy calls for the request. */
export const EGRESS_ORIGIN_HEADER = 'x-conductive-egress-origin'

type EgressEnv = Pick<AppEnv, 'CHATGPT_EGRESS_URL' | 'CHATGPT_EGRESS_SECRET'>

function chatGptHost(hostname: string): boolean {
  return hostname === 'chatgpt.com' || hostname.endsWith('.chatgpt.com')
}

/**
 * OpenAI blocks Cloudflare Worker traffic on chatgpt.com. When the deployment
 * names an egress proxy, each chatgpt.com request goes through that proxy.
 * Every other request keeps the direct path.
 */
export function chatGptEgress<T extends { fetch: HttpFetch }>(
  env: EgressEnv,
  dependencies: T,
): T {
  const proxy = env.CHATGPT_EGRESS_URL?.trim()
  const secret = env.CHATGPT_EGRESS_SECRET?.trim()
  if (!proxy || !secret) return dependencies
  let base: URL
  try {
    base = new URL(proxy)
  } catch {
    console.warn('CHATGPT_EGRESS_URL is not a valid URL. Direct path kept.')
    return dependencies
  }
  if (base.protocol !== 'https:') {
    console.warn('CHATGPT_EGRESS_URL must use https. Direct path kept.')
    return dependencies
  }
  const direct = dependencies.fetch
  return {
    ...dependencies,
    fetch: (request) => {
      const target = new URL(request.url)
      if (target.protocol !== 'https:' || !chatGptHost(target.hostname))
        return direct(request)
      const headers = new Headers(request.headers)
      headers.set(EGRESS_SECRET_HEADER, secret)
      headers.set(EGRESS_ORIGIN_HEADER, target.origin)
      const init = {
        method: request.method,
        headers,
        body: request.body,
        duplex: 'half',
        redirect: request.redirect,
        signal: request.signal,
      }
      return direct(
        new Request(`${base.origin}${target.pathname}${target.search}`, init),
      )
    },
  }
}
