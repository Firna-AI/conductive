import { expect, it } from 'vitest'

import { FakeAppServers } from '../test-support/app-server'
import { runnerHarness, turn } from '../test-support/harness'
import { FakeTitles } from '../test-support/titles'
import { deferred } from '../test-support/runtime'
import { createCodexTitle } from './providers/codex-title'

it('titles the first Codex turn in a hidden ephemeral read-only thread', async () => {
  const servers = new FakeAppServers()
  const titles = new FakeTitles()
  const entered = deferred<void>()
  const h = await runnerHarness({
    titles: {
      ...titles.agents,
      codex: createCodexTitle((request) => {
        servers.start(request)
        const server = servers.latest
        server.onRequest = (method) => {
          if (method !== 'turn/start') return
          queueMicrotask(() => {
            server.notify('item/completed', {
              item: {
                type: 'agentMessage',
                id: 'hidden-title',
                text: 'Title: `Fix Codex login routes.`',
              },
            })
            entered.resolve()
          })
        }
        return server
      }),
    },
  })
  const command = turn('codex', 'bob', 'codex')
  command.message.text = 'Fix the Codex login.'
  h.endpoint.send(command)
  await entered.promise
  await h.runner.engine.idle()
  expect(servers.latest.closed).toBe(false)
  expect(
    h.endpoint.runnerEvents.filter(
      ({ event }) => event.type === 'workspace.title',
    ),
  ).toEqual([])
  servers.latest.notify('turn/completed', {
    turn: { id: 'codex-turn-1', status: 'completed' },
  })
  await h.runner.idle()
  expect(
    h.endpoint.runnerEvents
      .filter(({ event }) => event.type === 'workspace.title')
      .map(({ event }) => event),
  ).toEqual([{ type: 'workspace.title', name: 'Fix Codex login routes' }])
  expect(servers.latest.writes.map((write) => write.method)).toEqual([
    'initialize',
    'initialized',
    'account/login/start',
    'thread/start',
    'turn/start',
  ])
  expect(servers.latest.writes[2]).toMatchObject({
    params: { type: 'apiKey', apiKey: 'secret-bob' },
  })
  expect(servers.latest.writes[3]).toMatchObject({
    params: {
      model: 'test-model',
      ephemeral: true,
      sandbox: 'read-only',
      approvalPolicy: 'never',
    },
  })
  expect(servers.latest.writes[4]).toMatchObject({
    params: {
      model: 'test-model',
      effort: 'high',
      input: [
        {
          type: 'text',
          text: 'Task message as a JSON string:\n"Fix the Codex login."',
          text_elements: [],
        },
      ],
    },
  })
  expect(servers.requests[0].args).toContain('features.shell_tool=false')
  expect(servers.requests[0].args).toContain('mcp_servers={}')
  expect(servers.requests[0].args.join(' ')).not.toContain('secret-bob')
  expect(JSON.stringify(servers.requests[0].env)).not.toContain('secret-bob')
  expect(servers.latest.closed).toBe(true)
  expect(h.warnings).toEqual([])
})

it('discards a Codex title answer when its hidden turn fails', async () => {
  const servers = new FakeAppServers()
  const titles = new FakeTitles()
  const h = await runnerHarness({
    titles: {
      ...titles.agents,
      codex: createCodexTitle((request) => {
        servers.start(request)
        const server = servers.latest
        server.onRequest = (method) => {
          if (method === 'turn/start')
            queueMicrotask(() => {
              server.notify('item/completed', {
                item: { type: 'agentMessage', text: 'A title before failure' },
              })
              server.notify('turn/completed', { turn: { status: 'failed' } })
            })
        }
        return server
      }),
    },
  })
  h.endpoint.send(turn('failure', 'alice', 'codex'))
  await h.runner.idle()
  expect(
    h.endpoint.runnerEvents.filter(
      ({ event }) => event.type === 'workspace.title',
    ),
  ).toEqual([])
  expect(h.warnings).toEqual(['The workspace title request failed.'])
  expect(servers.latest.closed).toBe(true)
  expect(h.providers.latest.closed).toBe(false)
})
