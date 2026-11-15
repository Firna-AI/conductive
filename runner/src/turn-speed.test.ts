import { expect, it } from 'vitest'

import { engineFixture } from '../test-support/engine'
import { turn } from '../test-support/harness'
import { EventStore } from './state'

it.each(['finished', 'stopped'] as const)(
  'keeps speed through %s and disk replay after a later fast report',
  async (state) => {
    const h = await engineFixture()
    const command = turn()
    command.message.choice.fast = true
    await h.engine.command(command)
    h.providers.latest.emit({
      type: 'speed',
      speed: { state: 'standard', cause: 'fast_limit' },
    })
    h.providers.latest.emit({ type: 'speed', speed: { state: 'fast' } })
    await h.engine.idle()
    if (state === 'stopped')
      await h.engine.command({
        type: 'interrupt',
        commandId: 'stop',
        sessionId: command.sessionId,
        turnId: command.turnId,
      })
    else {
      h.providers.latest.emit({
        type: 'result',
        state,
        userMessageIds: [command.message.id],
      })
      await h.engine.idle()
    }
    const expected = {
      type: 'turn.completed',
      state,
      speed: { state: 'standard', cause: 'fast_limit' },
    }
    expect(h.events.at(-1)).toMatchObject(expected)
    const reopened = await EventStore.open(h.storage)
    expect(reopened.snapshot.outbox.at(-1)?.event).toMatchObject(expected)
  },
)
