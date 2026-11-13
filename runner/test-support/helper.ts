import type { Agent } from '../../src/shared/generated/Agent'
import type { HelperOutput } from '../sdk-helper/src/generated/HelperOutput'
import type { HelperRequest } from '../sdk-helper/src/generated/HelperRequest'
import type { ProviderFactory } from '../sdk-helper/src/providers/types'
import { JsonLines } from '../sdk-helper/src/json-lines'
import { readRequest } from '../sdk-helper/src/read-request'
import { readOutput } from '../sdk-helper/src/read-output'
import { HelperSession } from '../sdk-helper/src/session'
import type { HelperPort } from '../src/helper-port'
import { deferred } from './runtime'

/** Uses the real readers and session with memory pipes at the process boundary. */
export class MemoryHelper implements HelperPort {
  private readonly completion = deferred<void>()
  readonly ended = deferred<void>()
  readonly exited = this.completion.promise
  readonly requests: HelperRequest[] = []
  private readonly outputs = new Set<(output: HelperOutput) => void>()
  private readonly exits = new Set<() => void>()
  private readonly input: JsonLines<HelperRequest>
  private readonly session: HelperSession
  holdExit = false
  private finished = false

  constructor(providers: Record<Agent, ProviderFactory>) {
    const lines = new JsonLines(readOutput, (message) => {
      for (const listener of this.outputs) listener(message)
    })
    this.session = new HelperSession(
      providers,
      (message) => {
        lines.push(Buffer.from(`${JSON.stringify(message)}\n`))
      },
      async () => {},
      () => {
        this.ended.resolve()
        if (!this.holdExit) this.finish()
      },
    )
    this.input = new JsonLines(readRequest, (request) => {
      this.requests.push(request)
      this.session.accept(request)
    })
  }

  write(request: HelperRequest): void {
    this.input.push(Buffer.from(`${JSON.stringify(request)}\n`))
  }
  onOutput(listener: (output: HelperOutput) => void): void {
    this.outputs.add(listener)
  }
  onExit(listener: () => void): void {
    this.exits.add(listener)
  }
  async terminate(): Promise<void> {
    await this.session.close()
    if (!this.holdExit) this.finish()
  }
  finish(): void {
    if (this.finished) return
    this.finished = true
    for (const listener of this.exits) listener()
    this.completion.resolve()
  }
}
