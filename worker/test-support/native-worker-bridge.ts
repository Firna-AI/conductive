import { nativePackets } from './native-protocol'
import { NativeValues, type NativeInvocation } from './native-values'

export class NativeWorkerBridge {
  readonly values: NativeValues
  private readonly service: Fetcher
  private readonly actorId: string

  constructor(service: Fetcher, actorId: string) {
    this.service = service
    this.actorId = actorId
    this.values = new NativeValues('worker', (invocation) =>
      this.call(invocation),
    )
  }

  private async call(invocation: NativeInvocation): Promise<unknown> {
    const response = await this.send({
      type: 'call',
      id: crypto.randomUUID(),
      invocation,
    })
    if (!response.body)
      throw new Error('The native callback stream is missing.')
    for await (const packet of nativePackets(response.body)) {
      if (packet.type === 'done') return this.values.result(packet.result)
      if (packet.type !== 'call') throw new Error('Expected a native command.')
      await this.send({
        type: 'result',
        id: packet.id,
        result: await this.values.invoke(packet.invocation),
      })
    }
    throw new Error('The native callback stream ended without a result.')
  }

  private send(packet: import('./native-protocol').NativePacket) {
    return this.service.fetch('https://native-bridge.test/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Native-Actor': this.actorId,
      },
      body: JSON.stringify(packet),
    })
  }
}
