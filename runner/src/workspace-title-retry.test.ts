import { expect, it, onTestFinished } from 'vitest'

import { runnerHarness, turn } from '../test-support/harness'
import { FakeTitles } from '../test-support/titles'
import { Runner } from './runner'
import { EventStore } from './state'

it.each(['error', 'empty'])(
  'warns once for a title %s and retries with the first text and the new turn login',
  async (failure) => {
    const titles = new FakeTitles()
    titles.reply = async () => {
      if (failure === 'error') throw new Error('Private provider failure')
      return 'Title: ""'
    }
    const h = await runnerHarness({ titles: titles.agents })
    const first = turn()
    first.message.text = 'A'.repeat(4_000) + 'Ignored tail'
    h.endpoint.send(first)
    await h.runner.idle()
    expect(
      h.endpoint.runnerEvents.filter(
        ({ event }) => event.type === 'workspace.title',
      ),
    ).toEqual([])
    expect(h.warnings).toEqual(['The workspace title request failed.'])
    expect(h.providers.latest.messages.map(({ turnId }) => turnId)).toEqual([
      'turn-1',
    ])
    h.providers.latest.emit({
      type: 'result',
      state: 'finished',
      userMessageIds: ['message-1'],
    })
    await h.runner.idle()
    titles.reply = async () => 'Retry the workspace title.'
    const retry = turn('retry', 'bob', 'codex')
    retry.sessionId = 'codex-session'
    retry.message.sessionId = 'codex-session'
    retry.message.text = 'Use a different text.'
    retry.message.choice.model = 'retry-model'
    h.endpoint.send(retry)
    await h.runner.idle()
    expect(
      titles.requests.map(({ text, login, choice }) => ({
        text,
        login,
        choice,
      })),
    ).toEqual([
      {
        text: 'A'.repeat(4_000),
        login: { agent: 'claude', kind: 'token', secret: 'secret-alice' },
        choice: { agent: 'claude', model: 'test-model', effort: 'high' },
      },
      {
        text: 'A'.repeat(4_000),
        login: { agent: 'codex', kind: 'api-key', secret: 'secret-bob' },
        choice: { agent: 'codex', model: 'retry-model', effort: 'high' },
      },
    ])
    expect(h.store.snapshot.reports.latest['workspace.title']).toEqual({
      type: 'workspace.title',
      name: 'Retry the workspace title',
    })
    expect(h.warnings).toEqual(['The workspace title request failed.'])
  },
)

it('does not request another title when the saved report survives a restart', async () => {
  const titles = new FakeTitles()
  const h = await runnerHarness({ titles: titles.agents })
  await h.runner.link.emit({
    type: 'workspace.title',
    name: 'Saved workspace title',
  })
  await h.runner.close()
  const runner = new Runner({
    ...h.options,
    store: await EventStore.open(h.storage),
  })
  onTestFinished(() => runner.close())
  await runner.start(false)
  h.endpoint.send(turn())
  await runner.idle()
  expect(titles.requests).toEqual([])
  expect(h.providers.latest.messages.map(({ turnId }) => turnId)).toEqual([
    'turn-1',
  ])
  expect(h.warnings).toEqual([])
})

it('uses its own first turn text after a failed request and a runner restart', async () => {
  const titles = new FakeTitles()
  titles.answer = ''
  const h = await runnerHarness({ titles: titles.agents })
  h.endpoint.send(turn())
  await h.runner.idle()
  await h.runner.close()
  titles.answer = 'Title after the restart'
  const runner = new Runner({
    ...h.options,
    store: await EventStore.open(h.storage),
  })
  onTestFinished(() => runner.close())
  await runner.start(false)
  const command = turn('restart')
  command.message.text = 'Fix the restarted runner.'
  h.endpoint.send(command)
  await runner.idle()
  expect(titles.requests.map(({ text }) => text)).toEqual([
    'Change the file.',
    'Fix the restarted runner.',
  ])
  expect(h.store.snapshot.reports.latest['workspace.title']).toBeNull()
  expect(runner.link.store.snapshot.reports.latest['workspace.title']).toEqual({
    type: 'workspace.title',
    name: 'Title after the restart',
  })
})
