import { createStackParser, type StackFrame } from '@sentry/core'
import { nodeStackLineParser } from '@sentry/core/server'

import { verifiedErrorStack } from '../../src/shared/error-stack'
import { workerErrorClassName } from './class-name'
import { knownWorkerErrorCode } from './codes'
import { workerErrorCause } from './causes'
import type { WorkerErrorDiagnostic } from './types'

export const workerStackParser = createStackParser(nodeStackLineParser())

export function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function workerFrames(input: unknown): StackFrame[] {
  if (!Array.isArray(input)) return []
  const frames: StackFrame[] = []
  for (const value of input.slice(-50)) {
    if (!record(value)) continue
    const frame: StackFrame = {}
    if (
      typeof value.function === 'string' &&
      value.function.length <= 120 &&
      /^(?:[A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*|<anonymous>|\?)$/.test(
        value.function,
      )
    )
      frame.function = value.function
    if (typeof value.filename === 'string') {
      const name = value.filename.split(/[?#]/, 1)[0].split(/[/\\]/).at(-1)
      if (name && /^(?:index|chunk-[A-Za-z0-9_-]{1,64})\.js$/.test(name))
        frame.filename = `/${name}`
    }
    if (Number.isSafeInteger(value.lineno) && Number(value.lineno) > 0)
      frame.lineno = Number(value.lineno)
    if (Number.isSafeInteger(value.colno) && Number(value.colno) > 0)
      frame.colno = Number(value.colno)
    frame.in_app = frame.filename !== undefined
    if (frame.filename || frame.function) frames.push(frame)
  }
  return frames
}

export function workerErrorDiagnostic(error: unknown): WorkerErrorDiagnostic {
  try {
    const code = record(error) ? knownWorkerErrorCode(error.code) : undefined
    error = workerErrorCause(error)
    const causeCode = record(error)
      ? knownWorkerErrorCode(error.code)
      : undefined
    const type = workerErrorClassName(
      error instanceof Error ? error.constructor?.name : undefined,
    )
    return {
      type,
      ...((code ?? causeCode) ? { code: code ?? causeCode } : {}),
      frames: errorFrames(error),
    }
  } catch {
    return { type: 'Error', frames: [] }
  }
}

function errorFrames(error: unknown): StackFrame[] {
  const stack = verifiedErrorStack(error)
  return stack === undefined ? [] : workerFrames(workerStackParser(stack))
}
