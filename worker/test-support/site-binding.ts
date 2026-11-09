export type SiteAssetFile = {
  body: string | Uint8Array<ArrayBuffer>
  contentType: string
}

export const APP_PAGE = '<html><script src="/assets/app.js"></script>App</html>'

/** The assets binding's HTML redirects and fallback, with recorded requests. */
export class SiteBinding {
  readonly requests: Request[] = []
  readonly replies = new Map<string, () => Response>()
  readonly files: Map<string, SiteAssetFile>

  constructor(files: Map<string, SiteAssetFile>) {
    this.files = files
  }

  async fetch(request: Request): Promise<Response> {
    this.requests.push(request)
    const url = new URL(request.url)
    const path = url.pathname
    const reply = this.replies.get(path)
    if (reply) return reply()
    const exact = this.files.get(path)
    if (exact && path.endsWith('.html')) {
      url.pathname = path.endsWith('/index.html')
        ? path.slice(0, -'index.html'.length)
        : path.slice(0, -'.html'.length)
      return new Response(null, {
        status: 307,
        headers: { Location: url.href },
      })
    }
    const file =
      exact ??
      this.files.get(`${path}${path.endsWith('/') ? 'index' : ''}.html`)
    if (
      !file &&
      path.endsWith('/') &&
      this.files.has(`${path.slice(0, -1)}.html`)
    ) {
      url.pathname = path.slice(0, -1)
      return new Response(null, {
        status: 307,
        headers: { Location: url.href },
      })
    }
    return new Response(
      request.method === 'HEAD' ? null : (file?.body ?? APP_PAGE),
      {
        headers: {
          'Content-Type': file?.contentType ?? 'text/html; charset=utf-8',
        },
      },
    )
  }
}
