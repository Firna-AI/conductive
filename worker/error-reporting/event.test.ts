import { expect, it } from 'vitest'

import { rebuildWorkerErrorEvent } from './event'
import type { WorkerEventContext } from './types'

const context: WorkerEventContext = {
  component: 'cron',
  classification: 'cron_failed',
  environment: 'development',
  timestamp: 1000,
}

it('rebuilds one exception with the nearest safe frames and remains idempotent', () => {
  const input = {
    event_id: 'a'.repeat(32),
    message: 'private message',
    debug_meta: { images: [{ code_file: '/private/file.js' }] },
    exception: {
      values: [
        {
          type: 'TypeError',
          value: 'private message',
          stacktrace: {
            frames: Array.from({ length: 70 }, (_, index) => ({
              function: 'run',
              filename: 'https://private.example/code/index.js?private=query',
              lineno: index + 1,
              colno: 2,
              in_app: false,
              vars: { token: 'private' },
              context_line: 'private source',
            })),
          },
        },
        { type: 'PrivateCause', value: 'private cause' },
      ],
    },
  }
  const event = rebuildWorkerErrorEvent(input, context)
  expect(event?.exception?.values).toHaveLength(1)
  const frames = event?.exception?.values?.[0].stacktrace?.frames
  expect(frames).toHaveLength(50)
  expect(frames?.[0]).toEqual({
    function: 'run',
    filename: '/index.js',
    lineno: 21,
    colno: 2,
    in_app: true,
  })
  expect(JSON.stringify(event)).not.toContain('private')
  expect(rebuildWorkerErrorEvent(event, context)).toEqual(event)
  expect(rebuildWorkerErrorEvent({ message: 'private' }, context)).toBeNull()
})
