import type { SandboxProvider } from '../sandbox/provider'
import { providerState } from './provider-state'
import type { StartRunTimer } from './start-run-timer'

/**
 * Times each provider call for the open start run. A command status read
 * counts as a poll. A create or resume request, and each read that shows a
 * ready sandbox, also leave a computer mark for the run.
 */
export function timedProvider(
  provider: SandboxProvider,
  timer: Pick<StartRunTimer, 'time' | 'mark'>,
): SandboxProvider {
  const time = <T>(name: string, call: () => Promise<T>) =>
    timer.time('provider', `provider.${name}`, call)
  const request = async <T>(name: string, call: () => Promise<T>) => {
    timer.mark('request-started')
    const result = await time(name, call)
    timer.mark('request-ended')
    return result
  }
  return {
    privatePort: (sandboxId, port, mode) =>
      time('privatePort', () => provider.privatePort(sandboxId, port, mode)),
    desktop: (sandboxId) => time('desktop', () => provider.desktop(sandboxId)),
    fileInfo: (sandboxId, path) =>
      time('fileInfo', () => provider.fileInfo(sandboxId, path)),
    readFile: (sandboxId, path, maxBytes) =>
      time('readFile', () => provider.readFile(sandboxId, path, maxBytes)),
    create: (input) => request('create', () => provider.create(input)),
    get: async (sandboxId) => {
      const sandbox = await time('get', () => provider.get(sandboxId))
      if (providerState(sandbox.state) === 'ready') timer.mark('ready')
      return sandbox
    },
    stop: (sandboxId) => time('stop', () => provider.stop(sandboxId)),
    resume: (sandboxId, env, ttlSeconds) =>
      request('resume', () => provider.resume(sandboxId, env, ttlSeconds)),
    fork: (sandboxId, input) =>
      time('fork', () => provider.fork(sandboxId, input)),
    delete: (sandboxId) => time('delete', () => provider.delete(sandboxId)),
    setAutoStop: (sandboxId, ttlSeconds) =>
      time('setAutoStop', () => provider.setAutoStop(sandboxId, ttlSeconds)),
    saveSnapshot: (sandboxId, name) =>
      time('saveSnapshot', () => provider.saveSnapshot(sandboxId, name)),
    getSnapshot: (name) =>
      time('getSnapshot', () => provider.getSnapshot(name)),
    deleteSnapshot: (name) =>
      time('deleteSnapshot', () => provider.deleteSnapshot(name)),
    runCommand: (sandboxId, command) =>
      time('runCommand', () => provider.runCommand(sandboxId, command)),
    startCommand: (sandboxId, command) =>
      time('startCommand', () => provider.startCommand(sandboxId, command)),
    getCommandStatus: (sandboxId, processId, offsets) =>
      timer.time('poll', 'provider.getCommandStatus', () =>
        provider.getCommandStatus(sandboxId, processId, offsets),
      ),
  }
}
