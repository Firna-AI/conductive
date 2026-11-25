import { FILE_READ_MAX_BYTES } from '../../src/shared/files'
import type { RunnerSkillError } from '../../src/shared/generated/RunnerSkillError'
import type { SkillIdentity } from '../../src/shared/skills'
import type { RunnerConnectionState } from '../chat/runner-connection-state'
import {
  RunnerReadRequests,
  type RunnerReadQueue,
} from '../chat/runner-read-requests'
import { natural } from '../files/parsers'
import { HttpError, isRecord } from '../http'

const maxBytes = Math.min(FILE_READ_MAX_BYTES, 1_048_576)
const readTimeoutMs = 30_000

export interface SkillReadOptions {
  authorize(): Promise<void>
  filter(text: string): string | Promise<string>
  signal?: AbortSignal
}

export function skillUnavailable(): HttpError {
  return new HttpError(
    503,
    'skill_unavailable',
    'The skill could not be read. Try again.',
  )
}

export class SkillTooLargeError extends HttpError {
  private readonly sizeBytes: number

  constructor(sizeBytes: number) {
    super(413, 'skill_too_large', 'The skill is too large to open.')
    this.sizeBytes = sizeBytes
  }

  response(): Response {
    return Response.json(
      {
        error: {
          code: 'skill_too_large',
          message: this.message,
          sizeBytes: this.sizeBytes,
          limitBytes: maxBytes,
        } satisfies RunnerSkillError,
      },
      { status: this.status },
    )
  }
}

function parseSkillResult(value: unknown): string {
  if (isRecord(value)) {
    if (value.ok === true && typeof value.text === 'string') {
      const bytes = new TextEncoder().encode(value.text).byteLength
      if (bytes > maxBytes) throw new SkillTooLargeError(bytes)
      return value.text
    }
    if (value.ok === false && isRecord(value.error)) {
      const { code, sizeBytes, limitBytes } = value.error
      if (code === 'skill_not_found')
        throw new HttpError(404, code, 'The skill is not available.')
      if (code === 'skill_unavailable') throw skillUnavailable()
      if (
        code === 'skill_too_large' &&
        natural(sizeBytes) &&
        natural(limitBytes)
      )
        throw new SkillTooLargeError(sizeBytes)
    }
  }
  throw new HttpError(
    502,
    'skill_unavailable',
    'The skill could not be read. Try again.',
  )
}

export class RunnerSkillReads {
  private readonly requests = new RunnerReadRequests(skillUnavailable)
  private readonly requestId: () => string

  constructor(requestId: () => string) {
    this.requestId = requestId
  }

  read(
    connection: Pick<RunnerConnectionState, 'id' | 'skillReads'>,
    { agent, name }: SkillIdentity,
    queue: RunnerReadQueue,
    { authorize, filter, signal }: SkillReadOptions,
  ): Promise<string> {
    if (connection.skillReads !== true)
      throw new HttpError(
        409,
        'skill_reads_unsupported',
        'Restart the cloud computer to open this skill.',
      )
    const requestId = this.requestId()
    return this.requests.requestWithAccess({
      connectionId: connection.id,
      resultType: 'skill.read.result',
      timeoutMs: readTimeoutMs,
      command: { type: 'skill.read', requestId, agent, name, maxBytes },
      parse: (value) => filter(parseSkillResult(value)),
      queue,
      authorize,
      signal,
    })
  }

  receive(connectionId: string, value: unknown): boolean {
    return this.requests.receive(connectionId, value)
  }

  detach(connectionId: string): void {
    this.requests.detach(connectionId)
  }
}
