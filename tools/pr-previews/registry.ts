import { previewNumber, type PreviewNames } from './names.ts'
import type { OperationContext } from './operations.ts'
import { Cloudflare } from './cloudflare.ts'
import { array, record, text } from './remote-values.ts'

export class PreviewRegistry {
  private readonly ctx: OperationContext
  private readonly cloudflare: Cloudflare
  private namespace: Promise<string | null> | undefined
  constructor(ctx: OperationContext) {
    this.ctx = ctx
    this.cloudflare = new Cloudflare(ctx)
  }

  private id(): Promise<string | null> {
    this.namespace ??= this.find()
    return this.namespace
  }

  private async find(): Promise<string | null> {
    const entries = await this.cloudflare.pages(
      this.cloudflare.account('/storage/kv/namespaces'),
    )
    for (const entry of entries) {
      const namespace = record(entry, 'KV namespace')
      if (namespace.title === 'conductive-preview-registry')
        return text(namespace.id, 'KV namespace ID')
    }
    return null
  }

  async add(names: PreviewNames): Promise<boolean> {
    const id = await this.id()
    if (id === null) {
      this.ctx.io.warn(
        'The relay registry is missing. GitHub events and install returns wait for the relay deploy.',
      )
      return false
    }
    await this.cloudflare.request(
      this.cloudflare.account(
        `/storage/kv/namespaces/${encodeURIComponent(id)}/values/pr-${names.number}`,
      ),
      'PUT',
      JSON.stringify({
        number: names.number,
        marketingOrigin: names.marketingOrigin,
        appOrigin: names.appOrigin,
        machineOrigin: names.machineOrigin,
      }),
    )
    return true
  }

  async remove(number: number): Promise<void> {
    const id = await this.id()
    if (id !== null)
      await this.cloudflare.request(
        this.cloudflare.account(
          `/storage/kv/namespaces/${encodeURIComponent(id)}/values/pr-${number}`,
        ),
        'DELETE',
        undefined,
        true,
      )
  }

  async numbers(): Promise<number[]> {
    const id = await this.id()
    if (id === null) return []
    const numbers: number[] = []
    let cursor = ''
    do {
      const query = new URLSearchParams({ limit: '1000', prefix: 'pr-' })
      if (cursor) query.set('cursor', cursor)
      const reply = await this.cloudflare.request(
        this.cloudflare.account(
          `/storage/kv/namespaces/${encodeURIComponent(id)}/keys?${query}`,
        ),
      )
      for (const entry of array(reply?.result, 'KV keys')) {
        const name = text(record(entry, 'KV key').name, 'KV key name')
        const number = previewNumber(name, 'pr-')
        if (number !== null) numbers.push(number)
      }
      cursor = typeof reply?.info.cursor === 'string' ? reply.info.cursor : ''
    } while (cursor)
    return numbers
  }
}
