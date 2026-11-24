import type { AppEnv } from '../env'
import { HttpError } from '../http'
import type { MachineChannel } from './channel'
import { machineClient } from './client'
import { hostError } from './errors'
import type { MachineOwner } from './identity'

type ObserveHostChannel = (host: MachineChannel) => MachineChannel
const observers = new WeakMap<D1Database, ObserveHostChannel>()

/** The workspace's timed database binding identifies the open start run. */
export function observeHostChannels(
  db: D1Database,
  observe: ObserveHostChannel,
): void {
  observers.set(db, observe)
}

export function hostChannel(env: AppEnv, owner: MachineOwner): MachineChannel {
  const client = machineClient(env, owner)
  const channel: MachineChannel = {
    runCommand: (command) =>
      hostCall(async () => {
        const { exitCode, stdout, stderr, timedOut } = await client.runCommand(
          command,
          600,
        )
        return { exitCode, stdout, stderr, timedOut }
      }),
    startCommand: (command) =>
      hostCall(async () => {
        const { processId } = await client.startCommand(command)
        return { processId, route: 'host' }
      }),
    getCommandStatus: ({ processId }, offsets, options) =>
      hostCall(async () => {
        const status = await client.commandStatus(
          processId,
          offsets.stdoutOffset,
          offsets.stderrOffset,
          options?.waitForHost,
        )
        return {
          ...offsets,
          processId: status.processId,
          state: status.state,
          running: status.running,
          exitCode: status.exitCode,
          timedOut: status.timedOut,
          stdout: status.stdout,
          stderr: status.stderr,
          stdoutNextOffset: status.stdoutNextOffset,
          stderrNextOffset: status.stderrNextOffset,
          more: status.more,
        }
      }),
  }
  return observers.get(env.DB)?.(channel) ?? channel
}

async function hostCall<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call()
  } catch (error) {
    if (error instanceof HttpError) throw error
    throw hostError('internal')
  }
}
