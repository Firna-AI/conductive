import { machineChannel, type MachineChannel } from '../machines/channel'
import { softwareImageMachineOwner } from '../machines/client'
import type { SandboxProvider } from '../sandbox/provider'
import type { SoftwareImageRuntime } from './types'

export function softwareImageChannel(
  runtime: SoftwareImageRuntime,
  provider: SandboxProvider,
  imageId: string,
  sandboxId: string,
): MachineChannel {
  const channel = machineChannel(
    runtime.env,
    softwareImageMachineOwner(imageId),
    provider,
    sandboxId,
  )
  const poll = runtime.poll
  if (!poll) return channel
  return {
    runCommand: (command) =>
      poll.runNetworkCall(() => channel.runCommand(command)),
    startCommand: (command) =>
      poll.runNetworkCall(() => channel.startCommand(command)),
    getCommandStatus: (command, offsets, options) =>
      poll.runNetworkCall(() =>
        channel.getCommandStatus(command, offsets, options),
      ),
  }
}
