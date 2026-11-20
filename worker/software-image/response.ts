import { privateResponse } from '../http'
import type { SoftwareImageResult } from './types'

/** Encode saved pieces independently so retained output needs no large JSON copy. */
export function softwareImageResponse(
  result: SoftwareImageResult,
  output: string[],
): Response {
  const parts = output.length ? [...output] : [result.output]
  const prefix = `${JSON.stringify({ ...result, output: undefined }).slice(0, -1)},"output":"`
  const encoder = new TextEncoder()
  let index = -1
  return privateResponse(
    new Response(
      new ReadableStream<Uint8Array>({
        pull(controller) {
          if (index === -1) {
            controller.enqueue(encoder.encode(prefix))
            index = 0
          } else if (index < parts.length) {
            controller.enqueue(
              encoder.encode(JSON.stringify(parts[index++]).slice(1, -1)),
            )
          } else {
            controller.enqueue(encoder.encode('"}'))
            controller.close()
          }
        },
      }),
      { headers: { 'Content-Type': 'application/json' } },
    ),
  )
}
