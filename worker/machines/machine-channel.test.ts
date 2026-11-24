import { expect, it } from 'vitest'

import { StartRunTimer } from '../lifecycle/start-run-timer'
import { timedHostChannel } from '../lifecycle/timed-provider'
import { LifecycleBoat } from '../lifecycle/lifecycle-boat-test-support'
import { DEFAULT_PROVIDER_ACCOUNT } from '../sandbox/account-identity'
import { providerForAccount } from '../sandbox/client'
import { machineChannel } from './channel'
import { observeHostChannels } from './host-channel'
import { setupMachines } from './host.test-support'

const fixtureForTest = setupMachines()

it('runs and times a synchronous host command after checking the provider fallback for old workspaces', async () => {
  const { env, owner, open } = await fixtureForTest()
  const boat = new LifecycleBoat()
  const provider = providerForAccount(env, boat.fetch, DEFAULT_PROVIDER_ACCOUNT)
  const unissued = { ...owner, workspaceId: 'unissued-workspace' }
  const noRecord = machineChannel(env, unissued, provider, 'bx_1')
  const noBinding = machineChannel(
    { ...env, MACHINES: undefined },
    owner,
    provider,
    'bx_2',
  )
  await expect(noRecord.runCommand('printf old')).resolves.toMatchObject({
    stdout: 'done\n',
  })
  await expect(noBinding.runCommand('printf unbound')).resolves.toMatchObject({
    stdout: 'done\n',
  })

  let now = 10
  const timer = new StartRunTimer(() => now)
  observeHostChannels(env.DB, (host) => timedHostChannel(host, timer))
  const host = await open()
  const channel = machineChannel(env, owner, provider, 'bx_3')
  timer.begin(false)
  const run = channel.runCommand('printf hello')
  const request = await host.inbox.request()
  now = 15
  host.send({
    type: 'reply',
    requestId: request.requestId,
    result: {
      kind: 'command.result',
      exitCode: 0,
      stdout: 'hello',
      stderr: '',
      timedOut: false,
    },
  })
  expect(await run).toEqual({
    exitCode: 0,
    stdout: 'hello',
    stderr: '',
    timedOut: false,
  })
  expect(request.operation).toEqual({
    kind: 'command.run',
    command: 'printf hello',
    timeoutSeconds: 600,
  })
  expect(timer.end()?.totals).toMatchObject({
    providerCalls: 1,
    providerMs: 5,
    pollCalls: 0,
    slowestCall: 'host.runCommand',
    slowestMs: 5,
  })
  expect(boat.commandRequests).toEqual([
    { sandboxId: 'bx_1', command: 'printf old', detached: false },
    { sandboxId: 'bx_2', command: 'printf unbound', detached: false },
  ])
})

it('keeps an unanswered machine RPC off the provider path', async () => {
  const { env, owner } = await fixtureForTest()
  const boat = new LifecycleBoat()
  const provider = providerForAccount(env, boat.fetch, DEFAULT_PROVIDER_ACCOUNT)
  if (!env.MACHINES) throw new Error('Missing test machine binding.')
  const machines = new Proxy(env.MACHINES, {
    get(target, key) {
      if (key === 'get') throw new Error('The machine RPC did not answer.')
      return Reflect.get(target, key)
    },
  })
  const channel = machineChannel(
    { ...env, MACHINES: machines },
    owner,
    provider,
    'bx_1',
  )

  await expect(channel.startCommand('true')).rejects.toMatchObject({
    status: 502,
    code: 'machine_error',
  })
  expect(boat.commands).toEqual([])
})
