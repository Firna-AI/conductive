import {
  createTransport,
  type BaseTransportOptions,
  type Envelope,
  type ErrorEvent,
  type Transport,
} from '@sentry/core'

import { productName } from '../../docs/mockups/src/brand'
import { rebuildWorkerErrorEvent } from './event'
import { record } from './frames'
import type { WorkerEventContext } from './types'

export type WorkerTransportFactory = (
  options: BaseTransportOptions,
) => Transport

export interface ApprovedWorkerEvent {
  context: WorkerEventContext
  eventId: string
  snapshot: ErrorEvent
}

export function privateWorkerTransport(
  options: BaseTransportOptions,
  approved: WeakMap<object, ApprovedWorkerEvent>,
  inner: WorkerTransportFactory = networkTransport,
): Transport {
  const transport = inner(options)
  return {
    send(envelope: Envelope) {
      try {
        for (const [header, input] of envelope[1]) {
          const payload: unknown = input
          if (header.type !== 'event' || !record(payload)) continue
          const approval = approved.get(payload)
          if (!approval || payload.event_id !== approval.eventId) continue
          approved.delete(payload)
          const context = approval.context
          const event = rebuildWorkerErrorEvent(approval.snapshot, context)
          if (!event || !event.event_id) continue
          return Promise.resolve(
            transport.send([
              {
                event_id: event.event_id,
                sent_at: new Date(context.timestamp * 1000).toISOString(),
              },
              [[{ type: 'event' }, event]],
            ]),
          ).catch(() => ({}))
        }
      } catch {
        // A failed report must not replace the application's result.
      }
      return Promise.resolve({})
    },
    flush(timeout) {
      try {
        return Promise.resolve(transport.flush(timeout)).catch(() => false)
      } catch {
        return Promise.resolve(false)
      }
    },
  }
}

function networkTransport(options: BaseTransportOptions): Transport {
  return createTransport(options, async ({ body }) => {
    const response = await fetch(options.url, {
      method: 'POST',
      body,
      redirect: 'manual',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        'User-Agent': productName,
      },
    })
    try {
      await response.body?.cancel()
    } catch {
      // Releasing an ingest response never changes the application result.
    }
    return {
      statusCode: response.status,
      headers: {
        'x-sentry-rate-limits': response.headers.get('X-Sentry-Rate-Limits'),
        'retry-after': response.headers.get('Retry-After'),
      },
    }
  })
}
