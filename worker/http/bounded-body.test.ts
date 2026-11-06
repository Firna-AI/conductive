import { expect, it } from 'vitest'

import { BodyBudgetExceeded, readBoundedBody } from './bounded-body'

it('collects every byte when the stream reaches the exact budget', async () => {
  let cancelled = 0
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([195, 169]))
      controller.enqueue(new Uint8Array([0, 255, 10]))
      controller.close()
    },
    cancel() {
      cancelled++
    },
  })
  await expect(readBoundedBody(body, 5)).resolves.toEqual(
    new Uint8Array([195, 169, 0, 255, 10]),
  )
  expect(cancelled).toBe(0)
})

it('cancels the stream when the next chunk exceeds the byte budget', async () => {
  const chunks = [
    new Uint8Array([1, 2]),
    new Uint8Array([3, 4]),
    new Uint8Array([5, 6]),
  ]
  let pulled = 0
  let cancelled = 0
  const body = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        const chunk = chunks[pulled]
        if (!chunk) {
          controller.close()
          return
        }
        pulled++
        controller.enqueue(chunk)
      },
      cancel() {
        cancelled++
      },
    },
    { highWaterMark: 0 },
  )
  await expect(readBoundedBody(body, 3)).rejects.toBeInstanceOf(
    BodyBudgetExceeded,
  )
  expect(pulled).toBe(2)
  expect(cancelled).toBe(1)
})
