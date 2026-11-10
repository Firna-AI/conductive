import type { ErrorEvent, EventHint } from '@sentry/core'
import { geckoStackLineParser } from '@sentry/react'

import { verifiedErrorStack } from '../shared/error-stack'
import { parseRoute, type Route } from './router'
import type { Navigation } from './navigation'

export const browserFailureMessages = {
  'react-uncaught': 'React reported an uncaught error.',
  'react-caught': 'React reported a caught error.',
  'react-recoverable': 'React reported a recoverable error.',
  'uncaught-error': 'The page reported an uncaught error.',
  'unhandled-rejection': 'The page reported an unhandled promise rejection.',
  'unexpected-error': 'The app reported an unexpected error.',
} as const

export type BrowserClassification = keyof typeof browserFailureMessages
export type BrowserStackFormat = 'v8' | 'headerless' | undefined
export interface BrowserRuntimeContext {
  browser?: { name: string; version: string }
  os?: { name: string; version?: string }
}

export function browserRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function browserException(
  input: unknown,
): Record<string, unknown> | undefined {
  if (!browserRecord(input) || !browserRecord(input.exception)) return undefined
  const values: unknown = input.exception.values
  const first: unknown = Array.isArray(values) ? values[0] : undefined
  return browserRecord(first) ? first : undefined
}

export function browserErrorType(exception: Record<string, unknown>): string {
  return typeof exception.type === 'string' &&
    /^[A-Za-z_$][A-Za-z0-9_$]{0,79}$/.test(exception.type)
    ? exception.type
    : 'Error'
}

export function browserClassification(
  event: ErrorEvent,
  hint: EventHint,
): BrowserClassification {
  const exception = browserException(event)
  const mechanism = browserRecord(exception?.mechanism)
    ? exception.mechanism
    : undefined
  switch (hint.mechanism?.type ?? mechanism?.type) {
    case 'conductive.react.uncaught':
      return 'react-uncaught'
    case 'conductive.react.caught':
      return 'react-caught'
    case 'conductive.react.recoverable':
      return 'react-recoverable'
    case 'auto.browser.global_handlers.onerror':
      return 'uncaught-error'
    case 'auto.browser.global_handlers.onunhandledrejection':
      return 'unhandled-rejection'
  }
  const classification = event.tags?.classification
  return classification === 'react-uncaught' ||
    classification === 'react-caught' ||
    classification === 'react-recoverable' ||
    classification === 'uncaught-error' ||
    classification === 'unhandled-rejection'
    ? classification
    : 'unexpected-error'
}

export function browserScreen(navigation: Navigation): Route['screen'] {
  try {
    const address = new URL(navigation.href(), 'https://app.invalid')
    return parseRoute(address.pathname, address.search).screen
  } catch {
    return 'not-found'
  }
}

const probeMessage =
  'Conductive stack probe.\n    at conductiveMessageProbe (https://probe.invalid/message.js:1:1)'

export function browserStackFormat(
  createError: (message: string) => Error,
): BrowserStackFormat {
  try {
    const probe = createError(probeMessage)
    const message = Object.getOwnPropertyDescriptor(probe, 'message')
    if (message?.value !== probeMessage) return undefined
    if (verifiedErrorStack(probe, 'v8') !== undefined) return 'v8'
    const stack = verifiedErrorStack(probe, 'headerless')
    return stack !== undefined &&
      !stack.includes('Conductive stack probe.') &&
      !stack.includes('conductiveMessageProbe') &&
      stack
        .split(/\r?\n/)
        .some((line) => geckoStackLineParser[1](line) !== undefined)
      ? 'headerless'
      : undefined
  } catch {
    return undefined
  }
}

export function browserRuntimeContext(agent: string): BrowserRuntimeContext {
  const browsers: readonly [string, RegExp][] = [
    ['Electron', /Electron\/([\d.]+)/],
    ['Edge', /Edg(?:e|A|iOS)?\/([\d.]+)/],
    ['Firefox', /(?:Firefox|FxiOS)\/([\d.]+)/],
    ['Chrome', /(?:Chrome|CriOS)\/([\d.]+)/],
    ['Safari', /Version\/([\d.]+).*Safari\//],
  ]
  const systems: readonly [string, RegExp][] = [
    ['Android', /Android ([\d.]+)/],
    ['iOS', /(?:CPU(?: iPhone)? OS|iPhone OS) ([\d_]+)/],
    ['macOS', /Mac OS X ([\d_]+)/],
    ['Windows', /Windows NT ([\d.]+)/],
  ]
  const context: BrowserRuntimeContext = {}
  for (const [name, pattern] of browsers) {
    const version = pattern.exec(agent)?.[1]
    if (version && /^[\d.]{1,50}$/.test(version)) {
      context.browser = { name, version }
      break
    }
  }
  for (const [name, pattern] of systems) {
    const version = pattern.exec(agent)?.[1]?.replaceAll('_', '.')
    if (version && /^[\d.]{1,50}$/.test(version)) {
      context.os = { name, version }
      break
    }
  }
  if (!context.os && /Linux/.test(agent)) context.os = { name: 'Linux' }
  return context
}
