import { isRecord } from '../../http'
import { ProviderError } from '../errors'
import type { CommandOffsets, CommandStatus } from '../provider'
import { ResponseBudget, responseOverflow } from './budgets'
import { EnvdSession } from './envd'
import { invalidResponse } from './errors'
import { fileSlice, jsonFile, statFile } from './file-content'
import { enforceCommandJson } from './command-json'

function commandPath(
  id: number,
  name: 'meta.json' | 'exit.json' | 'stdout' | 'stderr',
): string {
  if (!Number.isSafeInteger(id) || id < 1)
    throw new ProviderError('invalid_request', 400)
  return `/run/conductive-e2b-commands/${id}/${name}`
}

function lost(processId: number): CommandStatus {
  return {
    processId,
    state: 'lost',
    running: false,
    exitCode: null,
    timedOut: null,
    stdout: '',
    stderr: '',
    stdoutOffset: 0,
    stderrOffset: 0,
    stdoutNextOffset: 0,
    stderrNextOffset: 0,
    more: false,
  }
}

function completeBytes(bytes: Uint8Array, final: boolean): number {
  if (final || !bytes.byteLength) return bytes.byteLength
  let lead = bytes.byteLength - 1
  while (
    lead >= 0 &&
    (bytes[lead] & 0xc0) === 0x80 &&
    bytes.byteLength - lead < 4
  )
    lead--
  if (lead < 0) return bytes.byteLength
  const value = bytes[lead]
  const expected =
    value >= 0xc2 && value <= 0xdf
      ? 2
      : value >= 0xe0 && value <= 0xef
        ? 3
        : value >= 0xf0 && value <= 0xf4
          ? 4
          : 1
  return bytes.byteLength - lead < expected ? lead : bytes.byteLength
}

async function output(
  session: EnvdSession,
  path: string,
  requested: number,
  budget: ResponseBudget,
  final: boolean,
  complete: boolean,
) {
  if (!Number.isSafeInteger(requested) || requested < 0)
    throw new ProviderError('invalid_request', 400)
  const size = await statFile(session, path, budget)
  const offset = requested > size ? 0 : requested
  const count = Math.min(
    size - offset,
    complete ? budget.remaining() : 1_048_576,
    budget.remaining(),
  )
  if (!count && size > offset) return responseOverflow('command')
  const bytes = await fileSlice(session, path, offset, count, budget)
  const used = completeBytes(bytes, final && offset + bytes.byteLength >= size)
  return {
    text: new TextDecoder().decode(bytes.subarray(0, used)),
    offset,
    next: offset + used,
    more: offset + used < size,
  }
}

async function alive(
  session: EnvdSession,
  pid: number,
  ticks: string,
  budget: ResponseBudget,
): Promise<boolean> {
  let response: Response
  try {
    response = await session.send(
      { operation: 'read', path: `/proc/${pid}/stat` },
      budget,
    )
  } catch (error) {
    if (error instanceof ProviderError && error.kind === 'not_found')
      return false
    throw error
  }
  const text = new TextDecoder().decode(await budget.read(response.body, 4096))
  const boundary = text.lastIndexOf(') ')
  if (boundary < 0) return invalidResponse()
  return (
    text
      .slice(boundary + 2)
      .trim()
      .split(/\s+/)[19] === ticks
  )
}

export async function commandStatus(
  session: EnvdSession,
  processId: number,
  offsets: CommandOffsets,
  budget: ResponseBudget,
  complete = false,
): Promise<CommandStatus> {
  const meta = await jsonFile(
    session,
    commandPath(processId, 'meta.json'),
    budget,
  )
  if (meta === undefined) return lost(processId)
  if (
    !isRecord(meta) ||
    meta.processId !== processId ||
    typeof meta.pid !== 'number' ||
    !Number.isSafeInteger(meta.pid) ||
    meta.pid < 1 ||
    typeof meta.startTicks !== 'string' ||
    !/^\d+$/.test(meta.startTicks)
  )
    return invalidResponse()
  let end = await jsonFile(session, commandPath(processId, 'exit.json'), budget)
  let state: CommandStatus['state'] = 'running'
  let exitCode: number | null = null
  let timedOut: boolean | null = null
  if (end === undefined) {
    const running = await alive(session, meta.pid, meta.startTicks, budget)
    if (!running) {
      state = 'lost'
      end = await jsonFile(session, commandPath(processId, 'exit.json'), budget)
    }
  }
  if (end !== undefined) {
    if (
      !isRecord(end) ||
      end.processId !== processId ||
      typeof end.exitCode !== 'number' ||
      !Number.isSafeInteger(end.exitCode) ||
      (end.timedOut !== null && typeof end.timedOut !== 'boolean')
    )
      return invalidResponse()
    state = 'exited'
    exitCode = end.exitCode
    timedOut = end.timedOut
  }
  const stdout = await output(
    session,
    commandPath(processId, 'stdout'),
    offsets.stdoutOffset,
    budget,
    state !== 'running',
    complete,
  )
  const stderr = await output(
    session,
    commandPath(processId, 'stderr'),
    offsets.stderrOffset,
    budget,
    state !== 'running',
    complete,
  )
  const status: CommandStatus = {
    processId,
    state,
    running: state === 'running',
    exitCode,
    timedOut,
    stdout: stdout.text,
    stderr: stderr.text,
    stdoutOffset: stdout.offset,
    stderrOffset: stderr.offset,
    stdoutNextOffset: stdout.next,
    stderrNextOffset: stderr.next,
    more: stdout.more || stderr.more,
  }
  if (!complete) enforceCommandJson(status)
  return status
}
