import type { Envelope, Transport } from '@sentry/core'
import { makeFetchTransport } from '@sentry/react'

import {
  rebuildBrowserErrorEvent,
  type BrowserEventContext,
} from './error-reporting-event'
import { browserRecord } from './error-reporting-runtime'
import type { BrowserTransportFactory } from './error-reporting'

export interface ApprovedBrowserEvent {
  eventId: string
  context: BrowserEventContext
}

export function privateBrowserTransport(
  options: Parameters<typeof makeFetchTransport>[0],
  approved: WeakMap<object, ApprovedBrowserEvent>,
  active: () => boolean,
  inner: BrowserTransportFactory = makeFetchTransport,
): Transport {
  const transport = inner({
    ...options,
    fetchOptions: {
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      cache: 'no-store',
      redirect: 'error',
    },
  })
  return {
    send(envelope: Envelope) {
      try {
        if (!active()) return Promise.resolve({})
        for (const [header, input] of envelope[1]) {
          const payload: unknown = input
          if (header.type !== 'event' || !browserRecord(payload)) continue
          const approval = approved.get(payload)
          if (!approval || payload.event_id !== approval.eventId) continue
          approved.delete(payload)
          const event = rebuildBrowserErrorEvent(
            approval.eventId,
            approval.context,
          )
          if (!event) continue
          return Promise.resolve(
            transport.send([
              {
                event_id: approval.eventId,
                sent_at: new Date(
                  approval.context.timestamp * 1000,
                ).toISOString(),
              },
              [[{ type: 'event' }, event]],
            ]),
          ).catch(() => ({}))
        }
      } catch {
        return Promise.resolve({})
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
