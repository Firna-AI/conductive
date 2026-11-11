import { expect, it, vi } from 'vitest'

import '../../test-support/background'
import { FakeClaudeQuery } from '../../test-support/claude-query'
import { engineFixture } from '../../test-support/engine'
import { duringTurn, turn } from '../../test-support/harness'
import { FakeProviders, fakeClaudeProfile } from '../../test-support/providers'
import { createClaudeFactory } from './claude'
import type { ProviderProcess } from './types'

async function stop(sdk: FakeClaudeQuery, id = 'same-job') {
  const callback = sdk.parameters?.options?.hooks?.Stop?.[0]?.hooks[0]
  if (!callback) throw new Error('The adapter did not register its Stop hook.')
  return callback(
    {
      hook_event_name: 'Stop',
      session_id: 'sdk-session',
      transcript_path: '/transcript',
      cwd: '/repo',
      stop_hook_active: false,
      session_crons: [
        {
          id,
          schedule: '0 23 * * *',
          recurring: true,
          prompt: 'Check progress',
        },
      ],
    },
    undefined,
    { signal: new AbortController().signal },
  )
}

it('keeps named work on the same turn across a provider handoff', async () => {
  const sdks = [new FakeClaudeQuery(), new FakeClaudeQuery()]
  const providers: ProviderProcess[] = []
  let opened = 0
  const factory = createClaudeFactory(
    (parameters) => {
      const sdk = sdks[opened++]
      if (!sdk) throw new Error('The test opened an unexpected provider.')
      return sdk.open(parameters)
    },
    () => '/pinned/claude',
    fakeClaudeProfile,
  )
  const h = await engineFixture({
    providers: {
      claude: async (options) => {
        const provider = await factory(options)
        providers.push(provider)
        return provider
      },
      codex: new FakeProviders().open,
    },
  })
  await h.engine.command(turn())
  const first = await sdks[0].nextUser()
  expect(await stop(sdks[0])).toMatchObject({
    hookSpecificOutput: {
      hookEventName: 'Stop',
      additionalContext: expect.stringContaining('Wake-up same-job'),
    },
  })
  await sdks[0].raw({
    type: 'result',
    is_error: false,
    user_message_uuids: [first.uuid],
  })
  await sdks[0].raw({
    type: 'system',
    subtype: 'session_state_changed',
    state: 'idle',
  })
  await h.engine.idle()
  vi.spyOn(providers[0], 'model').mockResolvedValue('deferred')
  await h.engine.command({ ...duringTurn(turn('2')), turnId: 'turn-1' })
  await sdks[1].nextUser()
  expect(sdks[0].closed).toBe(true)
  expect(await stop(sdks[1])).toEqual({})
  expect(await stop(sdks[0], 'new-job')).toEqual({})
  expect(await stop(sdks[1], 'new-job')).toMatchObject({
    hookSpecificOutput: {
      hookEventName: 'Stop',
      additionalContext: expect.stringContaining('Wake-up new-job'),
    },
  })
  expect(h.events.map(({ type }) => type)).toEqual(['turn.started'])
})
