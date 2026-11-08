import { expect, it } from 'vitest'

import { runnerHarness, turn } from '../test-support/harness'
import { deferred } from '../test-support/runtime'
import { FakeTitles } from '../test-support/titles'

it('ignores blank text and replayed turns and keeps one title request beside running turns', async () => {
  const titles = new FakeTitles()
  const entered = deferred<void>()
  const result = deferred<string>()
  titles.reply = () => {
    entered.resolve()
    return result.promise
  }
  const h = await runnerHarness({ titles: titles.agents })
  const blank = turn('blank')
  blank.message.text = ' \n\t '
  h.endpoint.send(blank)
  await h.runner.idle()
  expect(titles.requests).toEqual([])
  h.providers.latest.emit({
    type: 'result',
    state: 'finished',
    userMessageIds: ['message-blank'],
  })
  await h.runner.idle()
  const first = turn('first')
  first.message.text = 'Create useful workspace titles.'
  h.endpoint.send(first)
  try {
    await entered.promise
    await h.runner.engine.idle()
    h.endpoint.send({ ...first, commandId: 'replayed-first' })
    h.endpoint.send({ ...first, type: 'message', commandId: 'message-first' })
    const other = turn('other')
    other.sessionId = 'other-session'
    other.message.sessionId = 'other-session'
    h.endpoint.send(other)
    await h.runner.link.idle()
    await h.runner.engine.idle()
    expect(titles.requests).toHaveLength(1)
    expect(titles.requests[0].text).toBe('Create useful workspace titles.')
    expect(h.providers.processes).toHaveLength(3)
    expect(
      h.endpoint.runnerEvents.filter(
        ({ event }) => event.type === 'workspace.title',
      ),
    ).toEqual([])
  } finally {
    result.resolve('Create useful workspace titles.')
    await h.runner.idle()
  }
  h.endpoint.send(turn('after-title'))
  await h.runner.idle()
  expect(titles.requests).toHaveLength(1)
  expect(h.store.snapshot.reports.latest['workspace.title']).toEqual({
    type: 'workspace.title',
    name: 'Create useful workspace titles',
  })
})

it('does not replace a title saved while a hidden request runs', async () => {
  const titles = new FakeTitles()
  const entered = deferred<void>()
  const result = deferred<string>()
  titles.reply = () => {
    entered.resolve()
    return result.promise
  }
  const h = await runnerHarness({ titles: titles.agents })
  h.endpoint.send(turn())
  await entered.promise
  try {
    await h.runner.link.emit({
      type: 'workspace.title',
      name: 'Already saved title',
    })
  } finally {
    result.resolve('Late generated workspace title')
    await h.runner.idle()
  }
  expect(
    h.endpoint.runnerEvents
      .filter(({ event }) => event.type === 'workspace.title')
      .map(({ event }) => event),
  ).toEqual([{ type: 'workspace.title', name: 'Already saved title' }])
  expect(h.warnings).toEqual([])
})
