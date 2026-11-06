import { Miniflare } from 'miniflare'
import { build } from 'vite'
import { expect, it } from 'vitest'

import { isRecord } from '../http'

function readMessage(value: unknown): { type: string; numbers: number[] } {
  if (!isRecord(value)) throw new Error('Invalid socket message')
  if (
    value.type === 'event' &&
    isRecord(value.envelope) &&
    typeof value.envelope.eventNumber === 'number'
  )
    return { type: 'event', numbers: [value.envelope.eventNumber] }
  if (
    value.type === 'history' &&
    isRecord(value.history) &&
    Array.isArray(value.history.events)
  )
    return {
      type: 'history',
      numbers: value.history.events.map((event: unknown) => {
        if (!isRecord(event) || typeof event.eventNumber !== 'number')
          throw new Error('Invalid stored event')
        return event.eventNumber
      }),
    }
  throw new Error('Invalid workspace socket message')
}

it('sends stored start steps before concurrent live events through one durable journal', async () => {
  const output = await build({
    configFile: false,
    logLevel: 'silent',
    build: {
      ssr: `${import.meta.dirname}/journal-runtime-worker.ts`,
      write: false,
      rollupOptions: {
        external: ['cloudflare:workers'],
        output: { format: 'es' },
      },
    },
  })
  const result = Array.isArray(output) ? output[0] : output
  if (!('output' in result))
    throw new Error('The runtime fixture did not build')
  const chunk = result.output.find((entry) => entry.type === 'chunk')
  if (!chunk) throw new Error('The runtime fixture has no entry')
  const runtime = new Miniflare({
    enableDevRegistry: false,
    telemetry: { enabled: false },
    cf: false,
    workers: [
      {
        config: {
          name: 'journal-test',
          compatibilityDate: '2026-11-06',
          exports: {
            JournalFixture: { type: 'durable-object', storage: 'sqlite' },
          },
          env: {
            JOURNALS: {
              type: 'durable-object',
              worker: 'journal-test',
              exportName: 'JournalFixture',
            },
          },
          manifest: {
            mainModule: 'index.js',
            modules: { 'index.js': { type: 'esm', contents: chunk.code } },
          },
        },
      },
    ],
  })
  try {
    await runtime.dispatchFetch('https://journal.test/append?label=first')
    const [response] = await Promise.all([
      runtime.dispatchFetch('https://journal.test/subscribe?after=0', {
        headers: { Upgrade: 'websocket' },
      }),
      runtime.dispatchFetch('https://journal.test/append?label=during'),
    ])
    const socket = response.webSocket
    if (!socket) throw new Error('The runtime did not open a socket')
    const messages: ReturnType<typeof readMessage>[] = []
    let resolveDone: () => void = () => {}
    const done = new Promise<void>((resolve) => {
      resolveDone = resolve
    })
    socket.addEventListener('message', (event) => {
      const raw: unknown = JSON.parse(String(event.data))
      const message = readMessage(raw)
      messages.push(message)
      if (message.numbers.includes(3)) resolveDone()
    })
    socket.accept()
    await runtime.dispatchFetch('https://journal.test/append?label=last')
    await done
    expect(messages[0].type).toBe('history')
    expect(messages.flatMap((message) => message.numbers)).toEqual([1, 2, 3])
    socket.close(1000, 'Finished')
  } finally {
    await runtime.dispose()
  }
})
