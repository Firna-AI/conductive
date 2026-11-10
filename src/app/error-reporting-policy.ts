import type { ErrorEvent, EventHint } from '@sentry/core'

import { browserBundleFrames } from './error-reporting-bundles'
import {
  rebuildBrowserErrorEvent,
  type BrowserEventContext,
} from './error-reporting-event'
import {
  browserClassification,
  browserErrorType,
  browserException,
  type BrowserStackFormat,
} from './error-reporting-runtime'
import {
  privateBrowserTransport,
  type ApprovedBrowserEvent,
} from './error-reporting-transport'
import type { BrowserTransportFactory } from './error-reporting'

export function createBrowserErrorPolicy(options: {
  context: () => Omit<
    BrowserEventContext,
    'classification' | 'exceptionType' | 'frames' | 'images'
  >
  bundleOrigin: string
  format: BrowserStackFormat
  active: () => boolean
  transport?: BrowserTransportFactory
}) {
  const approved = new WeakMap<object, ApprovedBrowserEvent>()
  return {
    beforeSend(event: ErrorEvent, hint: EventHint): ErrorEvent | null {
      try {
        if (
          !options.active() ||
          event.type !== undefined ||
          typeof event.event_id !== 'string'
        )
          return null
        const previous = approved.get(event)
        if (previous) {
          if (event.event_id !== previous.eventId) return null
          const clean = rebuildBrowserErrorEvent(
            previous.eventId,
            previous.context,
          )
          if (!clean) return null
          approved.delete(event)
          approved.set(clean, previous)
          return clean
        }
        const exception = browserException(event)
        if (!exception) return null
        const context: BrowserEventContext = {
          ...options.context(),
          classification: browserClassification(event, hint),
          exceptionType: browserErrorType(exception),
          ...browserBundleFrames(
            hint.originalException,
            options.format,
            options.bundleOrigin,
          ),
        }
        const clean = rebuildBrowserErrorEvent(event.event_id, context)
        if (!clean) return null
        approved.set(clean, { eventId: event.event_id, context })
        return clean
      } catch {
        return null
      }
    },
    transport: (transportOptions: Parameters<BrowserTransportFactory>[0]) =>
      privateBrowserTransport(
        transportOptions,
        approved,
        options.active,
        options.transport,
      ),
  }
}
