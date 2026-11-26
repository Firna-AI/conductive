import { beforeEach, expect, it, onTestFinished } from 'vitest'

import { FakeAppServers } from '../../test-support/app-server'
import { FakeClaudeQuery } from '../../test-support/claude-query'
import { mockComputerServer } from '../../test-support/computer-mcp'
import { providerFixture } from '../../test-support/fixture'
import { fakeClaudeProfile } from '../../test-support/profile'
import type { Agent } from '../generated/Agent'
import type { RunnerNotice } from '../generated/RunnerNotice'
import { object, string } from '../parse'
import { createClaudeFactory } from './claude'
import { createCodexFactory } from './codex'

beforeEach(mockComputerServer)

const notes = [{ id: 'note-1', text: 'Priya approved API_TOKEN.' }]
const notice: RunnerNotice = {
  type: 'notice',
  commandId: 'notice-command',
  sessionId: 'session-1',
  turnId: 'turn-1',
  notices: notes,
}

async function fixture(agent: Agent) {
  const h = await providerFixture(agent)
  const sdk = new FakeClaudeQuery()
  const servers = new FakeAppServers()
  const open =
    agent === 'claude'
      ? createClaudeFactory(sdk.open, () => '/fake/claude', fakeClaudeProfile)
      : createCodexFactory(servers.start)
  const provider = await open(h.options)
  onTestFinished(() => provider.close())
  const read = async (method: 'turn/start' | 'turn/steer') => {
    if (agent === 'claude') return string((await sdk.nextUser()).uuid)
    const request = servers.latest.writes.findLast(
      (write) => write.method === method,
    )
    const id = string(object(request?.params).clientUserMessageId)
    servers.latest.notify('item/completed', {
      item: { type: 'userMessage', clientId: id },
    })
    return id
  }
  const answer = async (id: string, messageId: string) => {
    if (agent === 'claude') {
      await sdk.raw({
        type: 'stream_event',
        user_message_uuid: id,
        event: { type: 'message_start', message: { id: messageId } },
      })
      await sdk.raw({
        type: 'assistant',
        user_message_uuid: id,
        message: {
          id: messageId,
          content: [{ type: 'text', text: 'Answer.' }],
        },
      })
      await sdk.raw({
        type: 'stream_event',
        user_message_uuid: id,
        event: { type: 'message_stop' },
      })
    } else
      servers.latest.notify('item/completed', {
        item: { type: 'agentMessage', id: messageId, text: 'Answer.' },
      })
  }
  const result = async (id?: string, failed = false) => {
    if (agent === 'claude')
      await sdk.raw({
        type: 'result',
        ...(id ? { user_message_uuid: id } : {}),
        is_error: failed,
        ...(failed
          ? { subtype: 'error_during_execution', errors: ['Provider failed.'] }
          : {}),
      })
    else
      servers.latest.notify('turn/completed', {
        turn: {
          status: failed ? 'failed' : 'completed',
          ...(failed ? { error: { message: 'Provider failed.' } } : {}),
        },
      })
  }
  return { ...h, provider, read, answer, result }
}

it.each(['claude', 'codex'] as const)(
  'receipts %s attached notes only after their input is read',
  async (agent) => {
    const h = await fixture(agent)
    await h.provider.send({ ...h.command, notices: notes })
    expect(h.events.filter((event) => 'noticeIds' in event)).toEqual([])
    const id = await h.read('turn/start')
    expect(h.events.filter((event) => 'noticeIds' in event)).toEqual([])
    await h.answer(id, 'answer')
    await h.result(id)
    expect(
      h.events.filter(
        (event) => event.type === 'answer' || event.type === 'result',
      ),
    ).toEqual([
      {
        type: 'answer',
        messageId: 'answer',
        text: 'Answer.',
        userMessageIds: ['message-1'],
        noticeIds: ['note-1'],
      },
      {
        type: 'result',
        state: 'finished',
        userMessageIds: ['message-1'],
        noticeIds: ['note-1'],
      },
    ])
  },
)

it.each(['claude', 'codex'] as const)(
  'keeps an accepted %s notice out of an earlier answer until its read proof',
  async (agent) => {
    const h = await fixture(agent)
    await h.provider.send(h.command)
    const first = await h.read('turn/start')
    await h.provider.send(notice)
    await h.answer(first, 'earlier-answer')
    expect(h.events.filter((event) => event.type === 'answer')).toEqual([
      {
        type: 'answer',
        messageId: 'earlier-answer',
        text: 'Answer.',
        userMessageIds: ['message-1'],
      },
    ])
    const next = await h.read('turn/steer')
    await h.answer(next, 'later-answer')
    await h.result(next)
    const userMessageIds = agent === 'claude' ? [] : ['message-1']
    expect(h.events.filter((event) => 'noticeIds' in event)).toEqual([
      {
        type: 'answer',
        messageId: 'later-answer',
        text: 'Answer.',
        userMessageIds,
        noticeIds: ['note-1'],
      },
      {
        type: 'result',
        state: 'finished',
        userMessageIds,
        noticeIds: ['note-1'],
      },
    ])
  },
)

it.each(['claude', 'codex'] as const)(
  'does not receipt %s attached notes on a failure without read proof',
  async (agent) => {
    const h = await fixture(agent)
    await h.provider.send({ ...h.command, notices: notes })
    await h.result(undefined, true)
    expect(h.events.filter((event) => event.type === 'failed')).toEqual([
      { type: 'failed', code: 'agent_failed', message: 'Provider failed.' },
    ])
    expect(h.events.filter((event) => 'noticeIds' in event)).toEqual([])
  },
)

it.each(['claude', 'codex'] as const)(
  'receipts %s notes read before a failure without an answer',
  async (agent) => {
    const h = await fixture(agent)
    await h.provider.send({ ...h.command, notices: notes })
    const id = await h.read('turn/start')
    await h.result(id, true)
    expect(h.events.filter((event) => event.type === 'failed')).toEqual([
      {
        type: 'failed',
        code: 'agent_failed',
        message: 'Provider failed.',
        noticeIds: ['note-1'],
      },
    ])
  },
)
