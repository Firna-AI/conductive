import type { ErrorEvent } from '@sentry/core'

import type { BrowserBundleFrames } from './error-reporting-bundles'
import {
  browserFailureMessages,
  type BrowserClassification,
  type BrowserRuntimeContext,
} from './error-reporting-runtime'
import type { Route } from './router'

export interface BrowserEventContext extends BrowserBundleFrames {
  timestamp: number
  release: string
  platform: 'web' | 'mac'
  screen: Route['screen']
  classification: BrowserClassification
  exceptionType: string
  runtime: BrowserRuntimeContext
  userId: string | null
}

export function rebuildBrowserErrorEvent(
  eventId: string,
  context: BrowserEventContext,
): ErrorEvent | null {
  if (!/^[a-f0-9]{32}$/.test(eventId) || !Number.isFinite(context.timestamp))
    return null
  const runtime = context.runtime
  return {
    type: undefined,
    event_id: eventId,
    timestamp: context.timestamp,
    platform: 'javascript',
    environment: 'production',
    release: context.release,
    exception: {
      values: [
        {
          type: context.exceptionType,
          value: browserFailureMessages[context.classification],
          ...(context.frames.length
            ? {
                stacktrace: {
                  frames: context.frames.map((frame) => ({ ...frame })),
                },
              }
            : {}),
        },
      ],
    },
    ...(context.images.length
      ? {
          debug_meta: {
            images: context.images.map((image) => ({ ...image })),
          },
        }
      : {}),
    ...(runtime.browser || runtime.os
      ? {
          contexts: {
            ...(runtime.browser ? { browser: { ...runtime.browser } } : {}),
            ...(runtime.os ? { os: { ...runtime.os } } : {}),
          },
        }
      : {}),
    tags: {
      platform: context.platform,
      classification: context.classification,
      screen: context.screen,
    },
    ...(context.userId === null ? {} : { user: { id: context.userId } }),
  }
}
