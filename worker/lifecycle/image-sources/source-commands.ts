import { linkWorkerError } from '../../error-reporting/causes'
import type {
  CommandOffsets,
  CommandStatus,
  SandboxProvider,
  StartedCommand,
} from '../../sandbox/provider'

class UncertainSourceCommandStart extends Error {
  constructor() {
    super('The source command start was not confirmed')
  }
}

/** Starts fail closed. Polls retain typed errors for the saved process. */
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
      throw linkWorkerError(new UncertainSourceCommandStart(), error)
    }
  }

  status(processId: number, offsets: CommandOffsets): Promise<CommandStatus> {
    return this.provider.getCommandStatus(this.sandboxId, processId, offsets)
  }
}
