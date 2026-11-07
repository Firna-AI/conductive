import { FakeBoat } from '../test-support/fake-boat'
import { BoatClient } from './boat'

export function paddedBody(value: Record<string, unknown>, size: number) {
  const json = new TextEncoder().encode(JSON.stringify(value))
  const bytes = new Uint8Array(size).fill(32)
  bytes.set(json)
  return bytes
}

export function countedReply(
  bytes: Uint8Array,
  options: { overflow?: boolean; status?: number } = {},
) {
  const chunks = options.overflow
    ? [bytes, new Uint8Array([32]), new Uint8Array([32])]
    : [
        bytes.subarray(0, bytes.byteLength / 2),
        bytes.subarray(bytes.byteLength / 2),
      ]
  const observed = { pulled: 0, bytes: 0, cancelled: 0 }
  const server = new FakeBoat()
  server.responseFactories = [
    () =>
      new Response(
        new ReadableStream<Uint8Array>(
          {
            pull(controller) {
              const chunk = chunks[observed.pulled]
              if (!chunk) {
                controller.close()
                return
              }
              observed.pulled++
              observed.bytes += chunk.byteLength
              controller.enqueue(chunk)
            },
            cancel() {
              observed.cancelled++
            },
          },
          { highWaterMark: 0 },
        ),
        {
          status: options.status ?? 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': options.overflow
              ? '1'
              : String(bytes.byteLength + 1),
            'Retry-After': '3',
          },
        },
      ),
  ]
  return {
    observed,
    server,
    client: new BoatClient('boat-first', server.fetch, 'app-org'),
  }
}

export function sandboxBody() {
  return {
    ok: true,
    type: 'sandbox.info',
    sandbox: { id: 'bx_one', state: 'ready' },
    text: 'é'.repeat(100_000),
  }
}

export function commandBody() {
  return {
    ok: true,
    type: 'command.finished',
    exitCode: 0,
    stdout: 'x'.repeat(8_388_608),
    stderr: 'y'.repeat(8_388_608),
    timedOut: false,
  }
}
