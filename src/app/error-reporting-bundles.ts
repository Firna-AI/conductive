import {
  getFilenameToDebugIdMap,
  type DebugImage,
  type StackFrame,
} from '@sentry/core'
import { defaultStackParser } from '@sentry/react'

import { verifiedErrorStack } from '../shared/error-stack'
import type { BrowserStackFormat } from './error-reporting-runtime'

interface BrowserBundle {
  filename: string
  debugId: string
}

export interface BrowserBundleFrames {
  frames: StackFrame[]
  images: DebugImage[]
}

function bundleName(address: string, origin: string): string | undefined {
  try {
    const url = new URL(address)
    const source = new URL(origin)
    if (
      url.protocol !== source.protocol ||
      url.host !== source.host ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      return undefined
    return /^\/assets\/([A-Za-z0-9_-][A-Za-z0-9._-]{0,159}\.js)$/.exec(
      url.pathname,
    )?.[1]
  } catch {
    return undefined
  }
}

function loadedBundles(origin: string): Map<string, BrowserBundle> {
  const bundles = new Map<string, BrowserBundle>()
  for (const [address, debugId] of Object.entries(
    getFilenameToDebugIdMap(defaultStackParser),
  )) {
    const filename = bundleName(address, origin)
    if (
      !filename ||
      !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(debugId)
    )
      continue
    const bundle = { filename, debugId: debugId.toLowerCase() }
    bundles.set(address, bundle)
    bundles.set(filename, bundle)
  }
  return bundles
}

export function browserBundleFrames(
  original: unknown,
  format: BrowserStackFormat,
  origin: string,
): BrowserBundleFrames {
  const frames: StackFrame[] = []
  const images: DebugImage[] = []
  if (format === undefined) return { frames, images }
  const stack = verifiedErrorStack(original, format)
  if (stack === undefined) return { frames, images }
  const bundles = loadedBundles(origin)
  const used = new Set<string>()
  for (const input of defaultStackParser(stack)) {
    const bundle = input.filename && bundles.get(input.filename)
    if (!bundle) continue
    const frame: StackFrame = { filename: bundle.filename, in_app: true }
    if (
      typeof input.function === 'string' &&
      input.function.length <= 120 &&
      /^(?:[A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*|<anonymous>|\?)$/.test(
        input.function,
      )
    )
      frame.function = input.function
    if (Number.isSafeInteger(input.lineno) && Number(input.lineno) > 0)
      frame.lineno = Number(input.lineno)
    if (Number.isSafeInteger(input.colno) && Number(input.colno) >= 0)
      frame.colno = Number(input.colno)
    frames.push(frame)
    if (used.has(bundle.filename)) continue
    used.add(bundle.filename)
    images.push({
      type: 'sourcemap',
      code_file: bundle.filename,
      debug_id: bundle.debugId,
    })
  }
  return { frames, images }
}
