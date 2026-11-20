import { afterEach, expect, it, vi } from 'vitest'

import { warnProviderStop } from './provider-stop-warning'
import { FIRST_MESSAGE, lifecycleFixture } from './durable-test-support'

afterEach(() => vi.restoreAllMocks())

it('reports a provider stop only after saving it and only once across publication and restart', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const providerStopped = vi.fn(async () => {
    expect(await fixture.lifecycle.read()).toMatchObject({
      state: 'stopped',
      providerStop: { at: 1_800_000_000_000 },
    })
    warnProviderStop(
      'abcdefghijklmnopqrstuvwxyz0123456789_-ABCDE',
      'boat-second',
      null,
    )
  })
  const fixture = lifecycleFixture({ providerStopped })
  await fixture.lifecycle.initialize({
    workspaceId: 'abcdefghijklmnopqrstuvwxyz0123456789_-ABCDE',
    orgId: 'org-one',
    firstMessage: FIRST_MESSAGE,
  })
  await fixture.lifecycle.turn('session-one', true)
  fixture.hooks.extendDeadline.mockResolvedValue('stopped')
  await fixture.lifecycle.turn('session-one', false)
  const restored = fixture.recreate()
  await restored.retryChanged()
  await restored.alarm()
  await restored.update((state) => state)
  expect(providerStopped).toHaveBeenCalledTimes(1)
  expect(warn.mock.calls).toEqual([
    [
      {
        kind: 'workspace_provider_stopped',
        message: 'A sandbox provider stopped a workspace during a turn.',
        workspaceId: 'abcdefghijklmnopqrstuvwxyz0123456789_-ABCDE',
        providerAccount: 'boat-second',
        connectionId: null,
        streamId: null,
        processStartId: null,
        protocolVersion: null,
      },
    ],
  ])
})

it('writes no warning when the stop state cannot be saved', async () => {
  const providerStopped = vi.fn()
  const fixture = lifecycleFixture({ providerStopped })
  await fixture.lifecycle.initialize({
    workspaceId: 'workspace-one',
    orgId: 'org-one',
    firstMessage: FIRST_MESSAGE,
  })
  await fixture.lifecycle.turn('session-one', true)
  fixture.hooks.extendDeadline.mockResolvedValue('stopped')
  vi.spyOn(fixture.storage, 'put').mockRejectedValueOnce(
    new Error('Store failed'),
  )
  await expect(fixture.lifecycle.alarm()).rejects.toThrow('Store failed')
  expect(providerStopped).toHaveBeenCalledTimes(0)
})
