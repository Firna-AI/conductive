import type { ProviderWork } from '../sandbox/provider'
import type { MachineChannel } from './channel'

/** The fallback binds the stored provider account and sandbox ID. */
export function providerChannel(
  provider: ProviderWork,
  sandboxId: string,
): MachineChannel {
  return {
    runCommand: (command) => provider.runCommand(sandboxId, command),
    startCommand: async (command) => ({
      ...(await provider.startCommand(sandboxId, command)),
      route: 'provider',
    }),
    getCommandStatus: ({ processId }, offsets) =>
      provider.getCommandStatus(sandboxId, processId, offsets),
  }
}
