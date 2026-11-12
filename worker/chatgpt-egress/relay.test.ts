import { describe, expect, it, vi } from 'vitest'
import { relayAnswer } from './relay'

const encoder = new TextEncoder()

function answerOf(
  source: UnderlyingSource<Uint8Array>,
  init: ResponseInit = {},
): Response {
  return new Response(new ReadableStream<Uint8Array>(source), init)
}

describe('relayAnswer', () => {
  it('relays each chunk in order with the status and the headers', async () => {
    const held: Promise<void>[] = []
    let chunks = 0
    const answer = answerOf(
      {
        start(controller) {
          for (const part of ['data: a\n\n', 'data: b\n\n', 'data: c\n\n'])
            controller.enqueue(encoder.encode(part))
          controller.close()
        },
      },
      { status: 201, headers: { 'content-type': 'text/event-stream' } },
    )
    const relayed = relayAnswer(
      answer,
      (work) => held.push(work),
      () => (chunks += 1),
    )
    expect(await relayed.text()).toBe('data: a\n\ndata: b\n\ndata: c\n\n')
    await Promise.all(held)
    expect(relayed.status).toBe(201)
    expect(relayed.headers.get('content-type')).toBe('text/event-stream')
    expect(chunks).toBe(3)
  })

  it('cancels the read from the container when the client stops reading', async () => {
    let cancelled: unknown = 'not cancelled'
    const answer = answerOf({
      start(controller) {
        controller.enqueue(encoder.encode('data: first\n\n'))
      },
      cancel(reason) {
        cancelled = reason
      },
    })
    const relayed = relayAnswer(
      answer,
      () => undefined,
      () => undefined,
    )
    if (!relayed.body) throw new Error('The relayed answer has no body.')
    const reader = relayed.body.getReader()
    await reader.read()
    await reader.cancel('client closed')
    // The container sends nothing more, so only the cancel can end its read.
    await vi.waitFor(() => expect(cancelled).toBe('client closed'), {
      timeout: 10_000,
    })
  })
})
