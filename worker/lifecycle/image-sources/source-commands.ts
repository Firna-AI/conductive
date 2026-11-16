import type {
  CommandOffsets,
  CommandStatus,
  SandboxProvider,
  StartedCommand,
} from '../../sandbox/provider'
import { ProviderError } from '../../sandbox/errors'

export function refusedSourceStart(error: unknown): error is ProviderError {
  return (
    error instanceof ProviderError &&
    ((error.kind === 'rate_limited' && error.status === 429) ||
      (error.kind === 'conflict' && error.status === 409))
  )
}

class UncertainSourceCommandStart extends Error {
  constructor() {
    super('The source command start was not confirmed')
  }
}

/** Only confirmed refusals can retry. Polls retain typed provider errors. */
export class SourceCommandPort {
  private readonly provider: Pick<
    SandboxProvider,
    'startCommand' | 'getCommandStatus'
  >
  private readonly sandboxId: string

  constructor(
    provider: Pick<SandboxProvider, 'startCommand' | 'getCommandStatus'>,
    sandboxId: string,
  ) {
    this.provider = provider
    this.sandboxId = sandboxId
  }

  async start(command: string): Promise<StartedCommand> {
    try {
      return await this.provider.startCommand(this.sandboxId, command)
    } catch (error) {
      if (refusedSourceStart(error)) throw error
      throw new UncertainSourceCommandStart()
    }
  }

  status(processId: number, offsets: CommandOffsets): Promise<CommandStatus> {
    return this.provider.getCommandStatus(this.sandboxId, processId, offsets)
  }
}
