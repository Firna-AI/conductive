import { HttpError } from '../../http'
import type {
  CommandOffsets,
  CommandStatus,
  MachineChannel,
} from '../../machines/channel'
import { ProviderError } from '../../sandbox/errors'
import type { RoutedCommand } from '../command-intents'

export function refusedSourceStart(error: unknown): boolean {
  return (
    (error instanceof ProviderError &&
      ((error.kind === 'rate_limited' && error.status === 429) ||
        (error.kind === 'conflict' && error.status === 409))) ||
    (error instanceof HttpError && error.code === 'machine_busy')
  )
}

class UncertainSourceCommandStart extends Error {
  constructor() {
    super('The source command start was not confirmed')
  }
}

/** Only confirmed refusals can retry. Polls retain typed provider errors. */
export class SourceCommandPort {
  private readonly channel: Pick<
    MachineChannel,
    'startCommand' | 'getCommandStatus'
  >

  constructor(
    channel: Pick<MachineChannel, 'startCommand' | 'getCommandStatus'>,
  ) {
    this.channel = channel
  }

  async start(command: string): Promise<RoutedCommand> {
    try {
      return await this.channel.startCommand(command)
    } catch (error) {
      if (refusedSourceStart(error)) throw error
      throw new UncertainSourceCommandStart()
    }
  }

  status(
    command: RoutedCommand,
    offsets: CommandOffsets,
  ): Promise<CommandStatus> {
    return this.channel.getCommandStatus(command, offsets)
  }
}
