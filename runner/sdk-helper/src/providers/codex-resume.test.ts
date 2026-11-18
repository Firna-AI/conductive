import { beforeEach, expect, it, onTestFinished } from 'vitest'

import { codexTokenFixture } from '../../test-support/codex-token'
import { mockComputerServer } from '../../test-support/computer-mcp'
import { turn } from '../../test-support/input'
import { object } from '../parse'
import { createCodexFactory } from './codex'
import type { StartProcess } from './process'
import type { ProviderEvent } from '../generated/ProviderEvent'

beforeEach(mockComputerServer)

interface RpcFailure {
  code: number
  message: string
  data?: unknown
}

async function fixture(
  failure?: RpcFailure,
  forkFailure?: RpcFailure,
  read?: { modelProvider: string } | RpcFailure,
) {
  const h = await codexTokenFixture()
  const events: ProviderEvent[] = []
  h.options.conversationId = 'saved-thread'
  h.options.instructions = 'Keep the saved session instructions.'
  h.options.event = (event) => events.push(event)
  const start: StartProcess = (request) => {
    const port = h.start(request)
    let receive: (line: string) => void = () => {}
    return {
      ...port,
      onLine(listener) {
        receive = listener
        port.onLine(listener)
      },
      write(line) {
        const input = object(JSON.parse(line))
        if (input.method === 'thread/read' && read) {
          h.servers.latest.writes.push(input)
          queueMicrotask(() =>
            receive(
              JSON.stringify({
                id: input.id,
                ...('code' in read
                  ? { error: read }
                  : { result: { thread: { id: 'saved-thread', ...read } } }),
              }),
            ),
          )
        } else if (
          (input.method === 'thread/resume' && failure) ||
          input.method === 'thread/fork'
        ) {
          h.servers.latest.writes.push(input)
          const error = input.method === 'thread/resume' ? failure : forkFailure
          queueMicrotask(() =>
            receive(
              JSON.stringify({
                id: input.id,
                ...(error
                  ? { error }
                  : { result: { thread: { id: 'forked-thread' } } }),
              }),
            ),
          )
        } else port.write(line)
      },
    }
  }
  return { ...h, events, start }
}

it.each([
  { type: 'modelProviderNotConfigured', kind: 'token', provider: 'openai' },
  { type: 'modelProviderMismatch', kind: 'api-key', provider: 'conductive' },
] as const)(
  'forks a refused $type resume and runs the turn on the new thread',
  async ({ type, kind, provider: modelProvider }) => {
    const h = await fixture({
      code: -32600,
      message: 'The saved provider cannot resume this conversation.',
      data: { type, modelProvider: 'earlier-provider' },
    })
    if (kind === 'api-key') {
      h.command.credential = turn('resume', 'alice', 'codex').credential
      h.options.credential = { type: 'gateway', ...h.command.credential }
    }
    const provider = await createCodexFactory(h.start)(h.options)
    onTestFinished(() => provider.close())
    const requests = h.servers.latest.writes.filter(({ method }) =>
      ['thread/resume', 'thread/fork'].includes(String(method)),
    )
    const params = {
      threadId: 'saved-thread',
      model: 'test-model',
      modelProvider,
      cwd: '/repo',
      developerInstructions: 'Keep the saved session instructions.',
      approvalPolicy: 'never',
      sandbox: 'danger-full-access',
    }
    expect(requests.map(({ method, params }) => ({ method, params }))).toEqual([
      { method: 'thread/resume', params },
      { method: 'thread/fork', params },
    ])
    expect(h.events).toEqual([{ type: 'conversation', id: 'forked-thread' }])
    await provider.send(h.command)
    expect(
      h.servers.latest.writes.find(({ method }) => method === 'turn/start'),
    ).toMatchObject({ params: { threadId: 'forked-thread' } })
  },
)

it.each([
  { saved: 'the read gives no provider', read: undefined },
  {
    saved: 'the read gives the current provider',
    read: { modelProvider: 'openai' },
  },
  {
    saved: 'the read fails',
    read: { code: -32600, message: 'thread not loaded: saved-thread' },
  },
])('keeps the resumed thread without forking when $saved', async ({ read }) => {
  const h = await fixture(undefined, undefined, read)
  const provider = await createCodexFactory(h.start)(h.options)
  onTestFinished(() => provider.close())
  expect(
    h.servers.latest.writes
      .filter(({ method }) => String(method).startsWith('thread/'))
      .map(({ method }) => method),
  ).toEqual(['thread/read', 'thread/resume'])
  expect(h.events).toEqual([{ type: 'conversation', id: 'codex-conversation' }])
  await provider.send(h.command)
  expect(h.servers.latest.writes.at(-1)).toMatchObject({
    method: 'turn/start',
    params: { threadId: 'codex-conversation' },
  })
})

it.each([
  {
    message: 'Managed provider policy does not permit this thread.',
    data: { type: 'modelProviderPolicyConflict' },
  },
  { message: 'This chat uses another provider.', data: null },
  { message: 'The thread cannot be loaded.' },
])(
  'fails a different resume error without a fork: $message',
  async (failure) => {
    const h = await fixture({ code: -32600, ...failure })
    await expect(createCodexFactory(h.start)(h.options)).rejects.toThrow(
      failure.message,
    )
    expect(h.servers.latest.closed).toBe(true)
    expect(h.events).toEqual([])
    expect(
      h.servers.latest.writes
        .filter(({ method }) => String(method).startsWith('thread/'))
        .map(({ method }) => method),
    ).toEqual(['thread/read', 'thread/resume'])
  },
)

it('fails a refused fork once and closes the App Server', async () => {
  const h = await fixture(
    {
      code: -32600,
      message: 'Provider mismatch.',
      data: { type: 'modelProviderMismatch' },
    },
    {
      code: -32600,
      message: 'The fork could not be saved.',
      data: { type: 'modelProviderMismatch' },
    },
  )
  await expect(createCodexFactory(h.start)(h.options)).rejects.toThrow(
    'The fork could not be saved.',
  )
  expect(h.servers.latest.closed).toBe(true)
  expect(h.events).toEqual([])
  expect(
    h.servers.latest.writes
      .filter(({ method }) => String(method).startsWith('thread/'))
      .map(({ method }) => method),
  ).toEqual(['thread/read', 'thread/resume', 'thread/fork'])
})

it('forks without a resume when the saved conversation used another provider', async () => {
  // Codex 0.170.0 refuses this resume without error data, so only the read
  // of the saved provider can start the fork.
  const h = await fixture(
    {
      code: -32600,
      message:
        "failed to load configuration: Cannot change this thread's model provider from `openai` to `conductive` on resume.",
    },
    undefined,
    { modelProvider: 'openai' },
  )
  h.command.credential = turn('resume', 'alice', 'codex').credential
  h.options.credential = { type: 'gateway', ...h.command.credential }
  const provider = await createCodexFactory(h.start)(h.options)
  onTestFinished(() => provider.close())
  const requests = h.servers.latest.writes.filter(({ method }) =>
    String(method).startsWith('thread/'),
  )
  expect(requests.map(({ method, params }) => ({ method, params }))).toEqual([
    {
      method: 'thread/read',
      params: { threadId: 'saved-thread', includeTurns: false },
    },
    {
      method: 'thread/fork',
      params: {
        threadId: 'saved-thread',
        model: 'test-model',
        modelProvider: 'conductive',
        cwd: '/repo',
        developerInstructions: 'Keep the saved session instructions.',
        approvalPolicy: 'never',
        sandbox: 'danger-full-access',
      },
    },
  ])
  expect(h.events).toEqual([{ type: 'conversation', id: 'forked-thread' }])
  await provider.send(h.command)
  expect(
    h.servers.latest.writes.find(({ method }) => method === 'turn/start'),
  ).toMatchObject({ params: { threadId: 'forked-thread' } })
})
