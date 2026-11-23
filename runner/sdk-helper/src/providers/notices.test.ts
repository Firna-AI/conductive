import { beforeEach, expect, it, onTestFinished } from 'vitest'

import { FakeAppServers } from '../../test-support/app-server'
import { FakeClaudeQuery } from '../../test-support/claude-query'
import { mockComputerServer } from '../../test-support/computer-mcp'
import { providerFixture } from '../../test-support/fixture'
import { instructionProviders } from '../../test-support/instructions'
import { fakeClaudeProfile } from '../../test-support/profile'
import type { RunnerNotice } from '../generated/RunnerNotice'
import { object, string } from '../parse'
import { readRequest } from '../read-request'
import { createClaudeFactory } from './claude'
import { createCodexFactory } from './codex'

beforeEach(mockComputerServer)

const notice: RunnerNotice = {
  type: 'notice',
  commandId: 'notice-command',
  sessionId: 'session-1',
  turnId: 'turn-1',
  notices: [
    { id: 'change-1', text: 'Priya approved API_TOKEN.' },
    { id: 'change-2', text: 'Priya pre-approved `DEPLOY_KEY`.' },
  ],
}
const appText =
  'Line of the app: no member wrote this text.\n\nPriya approved API_TOKEN.\nPriya pre-approved `DEPLOY_KEY`.'

it.each(['claude', 'codex'] as const)(
  'puts %s turn notes after the member text, sender, and current context',
  async (agent) => {
    const h = await providerFixture(agent)
    const adapter = instructionProviders(agent)
    const provider = await adapter.open({
      ...h.options,
      instructionFolder: '/repo/old',
      instructionBranches: { workspaceBranch: 'old', targetBranch: 'main' },
    })
    onTestFinished(() => provider.close())
    const command = {
      ...h.command,
      notices: notice.notices,
      branches: { workspaceBranch: 'new', targetBranch: 'trunk' },
      repository: { fullName: 'acme/new', folder: '/repo/new' },
    }
    const request = readRequest({
      type: 'send',
      requestId: '1',
      input: command,
    })
    expect(request).toEqual({ type: 'send', requestId: '1', input: command })
    if (request.type !== 'send') throw new Error('Expected send request.')
    await provider.send(request.input)
    const lines = `Sender: @alice [member ID: "alice"]\nCurrent repository: "acme/new" in the folder "/repo/new". The workspace now works in this folder. Its context folder is "/repo/new/.context".\nCurrent branches: workspace "new"; target "trunk".\n\n${appText}`
    expect(await adapter.input()).toMatchObject(
      agent === 'claude'
        ? { content: `Change the file.\n\n${lines}` }
        : {
            input: [
              { type: 'text', text: 'Change the file.', text_elements: [] },
              { type: 'text', text: lines, text_elements: [] },
            ],
          },
    )
  },
)

it.each(['claude', 'codex'] as const)(
  'steers %s with app text alone and reports notice IDs apart from member IDs',
  async (agent) => {
    const h = await providerFixture(agent)
    const sdk = new FakeClaudeQuery()
    const servers = new FakeAppServers()
    const open =
      agent === 'claude'
        ? createClaudeFactory(sdk.open, () => '/fake/claude', fakeClaudeProfile)
        : createCodexFactory(servers.start)
    const provider = await open(h.options)
    onTestFinished(() => provider.close())
    await provider.send(h.command)
    if (agent === 'claude') await sdk.nextUser()
    const request = readRequest({ type: 'send', requestId: '2', input: notice })
    expect(request).toEqual({ type: 'send', requestId: '2', input: notice })
    if (request.type !== 'send') throw new Error('Expected send request.')
    await provider.send(request.input)
    expect(h.events.filter((event) => 'noticeIds' in event)).toEqual([])
    if (agent === 'claude') {
      const input = await sdk.nextUser()
      expect(input.message).toEqual({ role: 'user', content: appText })
      const uuid = string(input.uuid)
      await sdk.raw({
        type: 'assistant',
        user_message_uuid: uuid,
        message: {
          id: 'answer',
          content: [{ type: 'text', text: 'Understood.' }],
        },
      })
      await sdk.raw({
        type: 'result',
        is_error: false,
        user_message_uuid: uuid,
      })
    } else {
      expect(
        servers.latest.writes.filter((write) => write.method === 'turn/start'),
      ).toHaveLength(1)
      expect(
        servers.latest.writes.find((write) => write.method === 'turn/steer'),
      ).toMatchObject({
        params: {
          expectedTurnId: 'codex-turn-1',
          input: [{ type: 'text', text: appText, text_elements: [] }],
        },
      })
      const steer = servers.latest.writes.find(
        (write) => write.method === 'turn/steer',
      )
      servers.latest.notify('item/completed', {
        item: {
          type: 'userMessage',
          clientId: string(object(steer?.params).clientUserMessageId),
        },
      })
      servers.latest.notify('item/completed', {
        item: { type: 'agentMessage', id: 'answer', text: 'Understood.' },
      })
      servers.latest.notify('turn/completed', { turn: { status: 'completed' } })
    }
    const userMessageIds = agent === 'claude' ? [] : ['message-1']
    expect(
      h.events.filter(
        (event) => event.type === 'answer' || event.type === 'result',
      ),
    ).toEqual([
      {
        type: 'answer',
        messageId: 'answer',
        text: 'Understood.',
        userMessageIds,
        noticeIds: ['change-1', 'change-2'],
      },
      {
        type: 'result',
        state: 'finished',
        userMessageIds,
        noticeIds: ['change-1', 'change-2'],
      },
    ])
  },
)

it('does not start another Codex turn for a notice after the provider turn ended', async () => {
  const h = await providerFixture('codex')
  const servers = new FakeAppServers()
  const provider = await createCodexFactory(servers.start)(h.options)
  onTestFinished(() => provider.close())
  await provider.send(h.command)
  servers.latest.notify('turn/completed', { turn: { status: 'completed' } })
  await provider.send(notice)
  expect(
    servers.latest.writes.filter((write) => write.method === 'turn/start'),
  ).toHaveLength(1)
  expect(
    servers.latest.writes.filter((write) => write.method === 'turn/steer'),
  ).toEqual([])
  expect(h.events.filter((event) => 'noticeIds' in event)).toEqual([])
})
