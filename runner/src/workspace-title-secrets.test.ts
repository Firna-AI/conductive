import { expect, it } from 'vitest'

import { runnerHarness, turn } from '../test-support/harness'
import { FakeTitles } from '../test-support/titles'
import { EventStore } from './state'

it.each([
  [
    'long login',
    'test-login-0123456789abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstu',
  ],
  ['underscore login', '_private-title-login_'],
])(
  'redacts the %s before cleaning the complete title answer',
  async (_kind, credential) => {
    const titles = new FakeTitles()
    titles.answer = credential
    const h = await runnerHarness({ titles: titles.agents })
    const command = turn()
    command.login.secret = credential
    h.endpoint.send(command)
    await h.runner.idle()
    expect(
      h.endpoint.runnerEvents
        .filter(({ event }) => event.type === 'workspace.title')
        .map(({ event }) => event),
    ).toEqual([{ type: 'workspace.title', name: '[redacted]' }])
    const restored = await EventStore.open(h.storage)
    expect(restored.snapshot.reports.latest['workspace.title']).toEqual({
      type: 'workspace.title',
      name: '[redacted]',
    })
  },
)

it('redacts the workspace token before cutting the first message at 4000 characters', async () => {
  const titles = new FakeTitles()
  const h = await runnerHarness({ titles: titles.agents })
  const command = turn()
  command.message.text = 'x'.repeat(3_990) + 'workspace-secret trailing text'
  h.endpoint.send(command)
  await h.runner.idle()
  expect(titles.requests.map(({ text }) => text)).toEqual([
    'x'.repeat(3_990) + '[redacted]',
  ])
})
