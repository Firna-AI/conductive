import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'

import { beforeEach, expect, it, onTestFinished, vi } from 'vitest'

import { FakeAppServers } from '../../test-support/app-server'
import { mockComputerServer } from '../../test-support/computer-mcp'
import { turn } from '../../test-support/harness'
import { fakeToolContext } from '../../test-support/providers'
import { createCodexFactory } from './codex'
import type { ProviderEvent } from './types'

beforeEach(mockComputerServer)

async function fixture(list?: (value: unknown) => unknown, resume = false) {
  const root = await mkdtemp(join(tmpdir(), 'codex-skills-'))
  onTestFinished(() => rm(root, { recursive: true, force: true }))
  const paths = {
    brainstorming: join(root, '.claude/skills/demo/SKILL.md'),
    plans: join(root, '.agents/skills/plans/SKILL.md'),
    disabled: join(root, '.agents/skills/disabled/SKILL.md'),
    unlisted: join(root, 'fixtures/SKILL.md'),
  }
  for (const path of Object.values(paths)) {
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, '# Skill\n')
  }
  const linked = join(root, '.agents/skills/linked')
  await symlink(dirname(paths.brainstorming), linked, 'dir')
  const response = {
    data: [
      {
        cwd: root,
        skills: Object.entries(paths)
          .filter(([name]) => name !== 'unlisted')
          .map(([name, path]) => ({
            name,
            path,
            enabled: name !== 'disabled',
            description: '',
            scope: 'repo',
            pluginId: null,
          })),
        errors: [],
      },
    ],
  }
  const servers = new FakeAppServers()
  servers.skillsList = () => (list ? list(response) : response)
  const events: ProviderEvent[] = []
  const warn = vi.fn<(message: string) => void>()
  const provider = await createCodexFactory(servers.start)({
    cwd: root,
    home: join(root, 'home'),
    sessionId: 'session-1',
    endpoint: 'https://gateway.test/codex',
    credential: {
      type: 'gateway',
      agent: 'codex',
      kind: 'api-key',
      token: 'test-token',
    },
    commitAuthor: null,
    choice: { agent: 'codex', model: 'test-model', effort: 'high' },
    conversationId: resume ? 'existing-thread' : null,
    instructions: '',
    tools: fakeToolContext,
    event: (event) => events.push(event),
    warn,
  })
  onTestFinished(() => provider.close())
  await provider.send(turn('1', 'alice', 'codex'))
  const server = servers.latest
  const command = (id: string, reads: string[], status = 'completed') => ({
    id,
    type: 'commandExecution',
    cwd: root,
    status,
    command: reads.map((path) => `sed -n '1,200p' ${path}`).join(' && '),
    commandActions: reads.map((path) => ({
      type: 'read',
      command: 'sed',
      name: 'SKILL.md',
      path,
    })),
  })
  const emit = (item: unknown, method = 'item/completed') =>
    server.notify(method, { item })
  const tools = () =>
    events.flatMap((event) => (event.type === 'tool' ? [event.tool] : []))
  return {
    root,
    paths,
    linked,
    response,
    servers,
    server,
    provider,
    events,
    warn,
    command,
    emit,
    tools,
  }
}

it('names two listed skills in read order through a linked folder', async () => {
  const h = await fixture()
  const item = h.command('read', [
    h.paths.plans,
    relative(h.root, join(h.linked, 'SKILL.md')),
    h.paths.plans,
  ])
  h.emit(item)
  expect(h.tools()).toEqual([
    {
      id: 'read',
      kind: 'run',
      state: 'done',
      skills: ['plans', 'brainstorming'],
      target: 'plans, brainstorming',
      detail: item.command,
      omittedDetailBytes: 0,
    },
  ])
  expect(
    h.server.writes.find((request) => request.method === 'skills/list'),
  ).toMatchObject({ params: { cwds: [h.root] } })
})

it('keeps unlisted, disabled, and unparsed skill reads as plain commands', async () => {
  const h = await fixture()
  h.emit(h.command('unlisted', [h.paths.unlisted]))
  h.emit(h.command('disabled', [h.paths.disabled]))
  h.emit({
    ...h.command('unknown', [h.paths.plans]),
    commandActions: [{ type: 'unknown', command: 'cat two files' }],
  })
  h.emit(h.command('listed', [h.paths.plans]))
  expect(
    h.tools().map((tool) => ({ id: tool.id, skills: tool.skills })),
  ).toEqual([
    { id: 'unlisted', skills: undefined },
    { id: 'disabled', skills: undefined },
    { id: 'unknown', skills: undefined },
    { id: 'listed', skills: ['plans'] },
  ])
})

it('names a loaded skill once per turn and resets for the next turn', async () => {
  const h = await fixture(undefined, true)
  h.emit(h.command('first', [h.paths.plans]))
  h.emit(h.command('next-page', [h.paths.plans]))
  h.server.notify('turn/completed', {
    turn: { id: 'codex-turn-1', status: 'completed' },
  })
  await h.provider.send(turn('2', 'alice', 'codex'))
  h.emit(h.command('next-turn', [h.paths.plans]))
  expect(h.tools().map((tool) => tool.skills)).toEqual([
    ['plans'],
    undefined,
    ['plans'],
  ])
  expect(
    h.server.writes.find((request) => request.method === 'thread/resume'),
  ).toMatchObject({ params: { threadId: 'existing-thread' } })
  expect(
    h.server.writes.find((request) => request.method === 'skills/list'),
  ).toMatchObject({ params: { cwds: [h.root] } })
})

it('names a read after an earlier read of the skill failed', async () => {
  const h = await fixture()
  h.emit(h.command('failed', [h.paths.plans], 'failed'), 'item/started')
  h.emit(h.command('failed', [h.paths.plans], 'failed'))
  h.emit(h.command('success', [h.paths.plans]), 'item/started')
  h.emit(h.command('success', [h.paths.plans]))
  h.emit(h.command('next-page', [h.paths.plans]))
  expect(
    h.tools().map((tool) => ({ state: tool.state, skills: tool.skills })),
  ).toEqual([
    { state: 'running', skills: ['plans'] },
    { state: 'failed', skills: ['plans'] },
    { state: 'running', skills: ['plans'] },
    { state: 'done', skills: ['plans'] },
    { state: 'done', skills: undefined },
  ])
})

it.each(['rejected', 'malformed', 'unreadable'])(
  'warns once for a %s list and keeps the turn running',
  async (failure) => {
    const h = await fixture(() => {
      if (failure === 'rejected') throw new Error('List unavailable')
      if (failure === 'malformed') return { data: [{ skills: null }] }
      return {
        data: [
          {
            skills: [
              { name: 'missing', enabled: true, path: '/missing/SKILL.md' },
            ],
          },
        ],
      }
    })
    h.server.notify('skills/changed', {})
    await h.server.idle()
    h.emit(h.command('read', [h.paths.plans]))
    expect(h.warn.mock.calls).toEqual([
      ['The Codex skill list could not be read. The turn will continue.'],
    ])
    expect(h.tools().map((tool) => tool.skills)).toEqual([undefined])
    expect(h.server.closed).toBe(false)
    h.server.notify('turn/completed', {
      turn: { id: 'codex-turn-1', status: 'completed' },
    })
    expect(
      h.events.filter(
        (event) => event.type === 'result' || event.type === 'failed',
      ),
    ).toEqual([
      { type: 'result', state: 'finished', userMessageIds: ['message-1'] },
    ])
  },
)

it('keeps item names stable when the list arrives or changes', async () => {
  let release: (value: unknown) => void = () => {}
  const pending = new Promise<unknown>((resolve) => {
    release = resolve
  })
  const h = await fixture(() => pending)
  h.emit(h.command('before-list', [h.paths.plans]), 'item/started')
  release(h.response)
  await h.server.idle()
  h.emit(h.command('after-list', [h.paths.plans]), 'item/started')
  h.servers.skillsList = () => ({ data: [] })
  h.server.notify('skills/changed', {})
  await h.server.idle()
  h.emit(h.command('before-list', [h.paths.plans]))
  h.emit(h.command('after-list', [h.paths.plans]))
  h.emit(h.command('after-change', [h.paths.brainstorming]))
  expect(
    h.tools().map((tool) => ({ id: tool.id, skills: tool.skills })),
  ).toEqual([
    { id: 'before-list', skills: undefined },
    { id: 'after-list', skills: ['plans'] },
    { id: 'before-list', skills: undefined },
    { id: 'after-list', skills: ['plans'] },
    { id: 'after-change', skills: undefined },
  ])
  expect(
    h.server.writes.filter((request) => request.method === 'skills/list'),
  ).toHaveLength(2)
})
