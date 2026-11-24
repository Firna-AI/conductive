import type { AppEnv } from '../env'
import { HttpError } from '../http'
import type { ProviderWork } from '../sandbox/provider'
import type { MachineHttpCode } from './errors'
import { hostChannel } from './host-channel'
import type { MachineOwner } from './identity'
import { providerChannel } from './provider-channel'

// These refusals occur before the machine object sends a request.
const FALLBACK_CODES = [
  'machine_unavailable',
  'machine_not_found',
  'service_unavailable',
] as const satisfies readonly MachineHttpCode[]

export interface CommandResult {
  exitCode: number | null
  stdout: string
  stderr: string
  timedOut: boolean
}

/** The number of bytes read from each output stream. */
export interface CommandOffsets {
  stdoutOffset: number
  stderrOffset: number
}

export interface CommandStatus extends CommandOffsets {
  processId: number
  state: 'running' | 'exited' | 'lost'
  running: boolean
  exitCode: number | null
  /** Null when the machine cannot report a timeout outcome. */
  timedOut: boolean | null
  stdout: string
  stderr: string
  stdoutNextOffset: number
  stderrNextOffset: number
  more: boolean
}

export type CommandRoute = 'host' | 'provider'

interface RoutedCommand {
  processId: number
  route: CommandRoute
}

export interface MachineChannel {
  runCommand(command: string): Promise<CommandResult>
  startCommand(command: string): Promise<RoutedCommand>
  getCommandStatus(
    command: RoutedCommand,
    offsets: CommandOffsets,
    options?: { waitForHost: boolean },
  ): Promise<CommandStatus>
}

/** The caller checks the org, owner, and current sandbox before using the channel. */
export function machineChannel(
  env: AppEnv,
  owner: MachineOwner,
  provider: ProviderWork,
  sandboxId: string,
): MachineChannel {
  const host = hostChannel(env, owner)
  const fallback = providerChannel(provider, sandboxId)
  return {
    runCommand: (command) =>
      hostOrProvider(
        () => host.runCommand(command),
        () => fallback.runCommand(command),
      ),
    startCommand: (command) =>
      hostOrProvider(
        () => host.startCommand(command),
        () => fallback.startCommand(command),
      ),
    getCommandStatus: (command, offsets, options) =>
      command.route === 'host'
        ? host.getCommandStatus(command, offsets, options)
        : fallback.getCommandStatus(command, offsets),
  }
}

async function hostOrProvider<T>(
  host: () => Promise<T>,
  fallback: () => Promise<T>,
): Promise<T> {
  try {
    return await host()
  } catch (error) {
    if (
      !(error instanceof HttpError) ||
      !FALLBACK_CODES.some((code) => code === error.code)
    )
      throw error
    return fallback()
  }
}
