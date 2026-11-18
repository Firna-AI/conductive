import type { HttpFetch } from '../env'
import { heldOperation } from '../test-support/held-operation'

export class FakeFeedbackResend {
  requests: { request: Request; body: string; key: string }[] = []
  deliveries = new Map<string, { id: string; body: string; at: number }>()
  refuse = false
  loseReply = false
  throwError = false
  status: number | null = null
  private held: (() => Promise<number>)[] = []
  private sequence = 0
  private readonly now: () => number

  constructor(now: () => number) {
    this.now = now
  }

  hold() {
    const held = heldOperation()
    let status = 200
    this.held.push(async () => {
      await held.wait()
      return status
    })
    return {
      entered: held.entered,
      reply(value: number) {
        status = value
        held.release()
      },
    }
  }

  fetch: HttpFetch = async (request) => {
    const body = await request.text()
    const key = request.headers.get('Idempotency-Key') ?? ''
    this.requests.push({ request, body, key })
    const held = this.held.shift()
    const status = held ? await held() : this.status
    if (status !== null && (status < 200 || status >= 300))
      return new Response(null, { status })
    if (this.throwError) throw new Error('private-provider-error')
    if (!key || key.length > 256)
      return Response.json({ message: 'Invalid key' }, { status: 400 })
    if (this.refuse)
      return Response.json(
        { message: 'private-provider-refusal' },
        { status: 403 },
      )
    let delivery = this.deliveries.get(key)
    if (delivery && delivery.at <= this.now() - 86_400_000) {
      this.deliveries.delete(key)
      delivery = undefined
    }
    if (delivery && delivery.body !== body)
      return Response.json(
        { message: 'Different body for this key' },
        { status: 409 },
      )
    if (!delivery) {
      delivery = {
        id: `feedback-email-${++this.sequence}`,
        body,
        at: this.now(),
      }
      this.deliveries.set(key, delivery)
    }
    if (this.loseReply) {
      this.loseReply = false
      throw new Error('Connection closed after delivery')
    }
    return Response.json({ id: delivery.id })
  }

  get deliveryCount() {
    return this.sequence
  }
}
