import { SDK_VERSION, type ErrorEvent } from '@sentry/core'

import { warningMessage } from '../warning-types'
import { workerErrorClassName } from './class-name'
import { knownWorkerErrorCode } from './codes'
import { record, workerFrames } from './frames'
import { isWorkerRouteTemplate } from './routes'
import {
  failureMessages,
  type WorkerClassification,
  type WorkerEventContext,
} from './types'

const methods = new Set([
  'GET',
  'HEAD',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
  'CONNECT',
  'TRACE',
])

function isFailureClassification(
  classification: WorkerClassification,
): classification is keyof typeof failureMessages {
  return Object.hasOwn(failureMessages, classification)
}

function classificationMessage(context: WorkerEventContext): string {
  return isFailureClassification(context.classification)
    ? failureMessages[context.classification]
    : warningMessage({ kind: context.classification })
}

export function rebuildWorkerErrorEvent(
  input: unknown,
  context: WorkerEventContext,
): ErrorEvent | null {
  try {
    if (
      !record(input) ||
      input.type !== undefined ||
      typeof input.event_id !== 'string' ||
      !/^[a-f0-9]{32}$/.test(input.event_id)
    )
      return null
    const exception = record(input.exception) ? input.exception : undefined
    const first = context.diagnostic
      ? {
          type: context.diagnostic.type,
          stacktrace: { frames: context.diagnostic.frames },
        }
      : Array.isArray(exception?.values)
        ? exception.values[0]
        : undefined
    if (!record(first) || !Number.isFinite(context.timestamp)) return null
    const request = context.request
    if (
      context.classification === 'request_failed' &&
      (!request?.status || request.status < 500 || request.status > 599)
    )
      return null
    const tags: Record<string, string> = {
      component: context.component,
      classification: context.classification,
    }
    const code = knownWorkerErrorCode(context.errorCode)
    if (code) tags['error.code'] = code
    if (request?.method && methods.has(request.method))
      tags['http.method'] = request.method
    if (isWorkerRouteTemplate(request?.route))
      tags['http.route'] = request.route
    if (
      request?.status &&
      Number.isInteger(request.status) &&
      request.status >= 100 &&
      request.status <= 599
    )
      tags['http.status_code'] = String(request.status)
    if (request?.ray && /^[a-f0-9]{16}(?:-[A-Z]{3})?$/.test(request.ray))
      tags['cf.ray_id'] = request.ray
    if (context.warningTags)
      for (const [key, value] of Object.entries(context.warningTags))
        tags[key] = value
    const frames = workerFrames(
      record(first.stacktrace) ? first.stacktrace.frames : undefined,
    )
    return {
      type: undefined,
      event_id: input.event_id,
      timestamp: context.timestamp,
      platform: 'javascript',
      level: 'error',
      environment: context.environment,
      ...(context.release &&
      /^conductive@(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(context.release)
        ? { release: context.release }
        : {}),
      sdk: { name: 'sentry.javascript.cloudflare', version: SDK_VERSION },
      exception: {
        values: [
          {
            type: workerErrorClassName(first.type),
            value: classificationMessage(context),
            ...(frames.length ? { stacktrace: { frames } } : {}),
          },
        ],
      },
      tags,
    }
  } catch {
    return null
  }
}
