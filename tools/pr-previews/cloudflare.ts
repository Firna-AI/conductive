import type { OperationContext } from './operations.ts'
import { array, httpJson, record } from './remote-values.ts'

interface Envelope {
  result: unknown
  info: Record<string, unknown>
}

export class Cloudflare {
  private readonly ctx: OperationContext
  constructor(ctx: OperationContext) {
    this.ctx = ctx
  }

  account(path: string): string {
    return `/accounts/${encodeURIComponent(this.ctx.settings.accountId)}${path}`
  }

  async request(
    path: string,
    method = 'GET',
    body?: string,
    missing = false,
  ): Promise<Envelope | null> {
    const value = await httpJson(
      this.ctx.io.fetch,
      new Request(`https://api.cloudflare.com/client/v4${path}`, {
        method,
        body,
        redirect: 'error',
        headers: {
          Authorization: `Bearer ${this.ctx.settings.apiToken}`,
          'Content-Type': 'application/json',
        },
      }),
      'Cloudflare',
      missing,
    )
    if (value === null) return null
    const envelope = record(value, 'Cloudflare')
    if (envelope.success !== true)
      throw new Error('Cloudflare returned an unsuccessful reply.')
    return {
      result: envelope.result,
      info:
        envelope.result_info === undefined
          ? {}
          : record(envelope.result_info, 'Cloudflare pagination'),
    }
  }

  async list(path: string): Promise<unknown[]> {
    const reply = await this.request(path)
    return array(reply?.result, 'Cloudflare')
  }

  async pages(path: string): Promise<unknown[]> {
    const results: unknown[] = []
    for (let page = 1; ; page++) {
      const url = new URL(path, 'https://api.cloudflare.com')
      url.searchParams.set('page', String(page))
      url.searchParams.set('per_page', '100')
      const reply = await this.request(`${url.pathname}${url.search}`)
      results.push(...array(reply?.result, 'Cloudflare'))
      const pages = reply?.info.total_pages
      if (pages === undefined || (typeof pages === 'number' && page >= pages))
        return results
      if (!Number.isSafeInteger(pages) || Number(pages) < 1)
        throw new Error('Cloudflare returned invalid pagination.')
    }
  }
}
