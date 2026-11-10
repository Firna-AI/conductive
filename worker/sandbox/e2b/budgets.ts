import { HttpError } from '../../http'
import { BodyBudgetExceeded, readBoundedBody } from '../../http/bounded-body'

export const CONTROL_BUDGET = 1_048_576
export const COMMAND_BUDGET = 18_874_368

export function responseOverflow(kind: 'command' | 'sandbox' | 'file'): never {
  throw new HttpError(
    502,
    kind === 'command'
      ? 'command_output_too_large'
      : 'sandbox_response_too_large',
    kind === 'command'
      ? 'The command output is too large.'
      : 'The cloud computer response is too large.',
  )
}

export class ResponseBudget {
  readonly kind: 'command' | 'sandbox' | 'file'
  readonly limit: number
  private used = 0

  constructor(
    kind: 'command' | 'sandbox' | 'file',
    limit = kind === 'command' ? COMMAND_BUDGET : CONTROL_BUDGET,
  ) {
    this.kind = kind
    this.limit = limit
  }

  remaining(): number {
    return this.limit - this.used
  }

  add(count: number): void {
    if (count > this.remaining()) {
      if (this.kind === 'file') throw new BodyBudgetExceeded()
      return responseOverflow(this.kind)
    }
    this.used += count
  }

  async read(
    body: ReadableStream<Uint8Array> | null,
    cap = this.remaining(),
  ): Promise<Uint8Array<ArrayBuffer>> {
    if (!body) return new Uint8Array()
    let bytes: Uint8Array<ArrayBuffer>
    try {
      bytes = await readBoundedBody(body, Math.min(cap, this.remaining()))
    } catch (error) {
      if (error instanceof BodyBudgetExceeded && this.kind !== 'file')
        return responseOverflow(this.kind)
      throw error
    }
    this.add(bytes.byteLength)
    return bytes
  }
}
