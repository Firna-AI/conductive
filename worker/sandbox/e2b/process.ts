import { HttpError, isRecord } from '../../http'
import { ProviderError } from '../errors'
import { ResponseBudget } from './budgets'
import { connectFrame, connectFrames } from './connect'
import { connectFailure } from './envd-errors'
import { EnvdSession } from './envd'
import { invalidResponse } from './errors'

type ProcessEvent =
  | { kind: 'start'; pid: number }
  | { kind: 'data'; stream: 'stdout' | 'stderr'; bytes: Uint8Array }
  | { kind: 'end'; exitCode: number; exited: boolean }

function event(value: unknown): ProcessEvent | null {
  if (!isRecord(value) || !isRecord(value.event)) return invalidResponse()
  const current = value.event
  if (
    ['start', 'data', 'end', 'keepalive'].filter(
      (key) => current[key] !== undefined,
    ).length !== 1
  )
    return invalidResponse()
  if (
    isRecord(current.start) &&
    Number.isSafeInteger(current.start.pid) &&
    typeof current.start.pid === 'number' &&
    current.start.pid > 0
  )
    return { kind: 'start', pid: current.start.pid }
  if (isRecord(current.data)) {
    const data = current.data
    const stream =
      typeof data.stdout === 'string'
        ? 'stdout'
        : typeof data.stderr === 'string'
          ? 'stderr'
          : null
    if (!stream || (data.stdout !== undefined && data.stderr !== undefined))
      return invalidResponse()
    const encoded = data[stream]
    if (typeof encoded !== 'string') return invalidResponse()
    try {
      return {
        kind: 'data',
        stream,
        bytes: Uint8Array.from(atob(encoded), (character) =>
          character.charCodeAt(0),
        ),
      }
    } catch {
      return invalidResponse()
    }
  }
  if (isRecord(current.end)) {
    const code = current.end.exitCode ?? 0
    const exited = current.end.exited ?? false
    if (
      !Number.isSafeInteger(code) ||
      typeof code !== 'number' ||
      typeof exited !== 'boolean'
    )
      return invalidResponse()
    return { kind: 'end', exitCode: code, exited }
  }
  if (isRecord(current.keepalive)) return null
  return invalidResponse()
}

export async function* pythonProcess(
  session: EnvdSession,
  source: string,
  config: Record<string, unknown>,
  budget: ResponseBudget,
  timeoutSeconds: number,
): AsyncGenerator<ProcessEvent> {
  const milliseconds = timeoutSeconds ? (timeoutSeconds + 10) * 1000 : 0
  const response = await session.send({ operation: 'start' }, budget, {
    user: 'root',
    timeoutMs: timeoutSeconds ? milliseconds : 30_000,
    body: connectFrame({
      process: {
        cmd: '/usr/bin/python3',
        args: ['-c', source, JSON.stringify(config)],
        envs: {},
      },
      stdin: false,
    }),
    headers: {
      'Content-Type': 'application/connect+json',
      'Connect-Protocol-Version': '1',
      'Connect-Timeout-Ms': String(milliseconds),
    },
  })
  let started = false
  let ended = false
  try {
    for await (const frame of connectFrames(response.body, budget)) {
      if (frame.terminal) {
        if (!isRecord(frame.value)) return invalidResponse()
        if (frame.value.error !== undefined)
          return connectFailure(frame.value.error)
        if (!ended) return invalidResponse()
        continue
      }
      const current = event(frame.value)
      if (!current) continue
      if (
        ended ||
        (current.kind !== 'start' && !started) ||
        (current.kind === 'start' && started)
      )
        return invalidResponse()
      if (current.kind === 'start') started = true
      if (current.kind === 'end') ended = true
      yield current
    }
  } catch (error) {
    if (error instanceof ProviderError || error instanceof HttpError)
      throw error
    throw new ProviderError('unavailable', 503)
  }
}

export async function executePython(
  session: EnvdSession,
  source: string,
  config: Record<string, unknown>,
  budget: ResponseBudget,
  timeoutSeconds: number,
): Promise<void> {
  let success = false
  for await (const current of pythonProcess(
    session,
    source,
    config,
    budget,
    timeoutSeconds,
  )) {
    if (current.kind === 'end')
      success = current.exited && current.exitCode === 0
  }
  if (!success) throw new ProviderError('unavailable', 503)
}
