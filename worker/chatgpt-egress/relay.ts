/**
 * Copies an answer chunk by chunk in the Durable Object's own code. In live
 * tests, an answer that the object passed on unchanged stopped after 1 to 12
 * minutes. A relayed answer streamed for 16 minutes.
 *
 * `hold` keeps the object busy until the relay ends.
 */
export function relayAnswer(
  answer: Response,
  hold: (work: Promise<void>) => void,
): Response {
  if (!answer.body) return answer
  const reader = answer.body.getReader()
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
  const writer = writable.getWriter()
  // A client that stops reading cancels the read from the container at once.
  // The cancel of a failed answer rejects, and the relay already handles it.
  writer.closed
    .catch((reason: unknown) => reader.cancel(reason))
    .catch(() => undefined)
  hold(
    (async () => {
      try {
        for (;;) {
          const chunk = await reader.read()
          if (chunk.done) break
          await writer.write(chunk.value)
        }
        await writer.close()
      } catch (error) {
        await Promise.allSettled([reader.cancel(error), writer.abort(error)])
      }
    })(),
  )
  return new Response(readable, answer)
}
