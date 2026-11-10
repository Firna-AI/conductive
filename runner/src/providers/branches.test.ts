import { beforeEach, expect, it, onTestFinished, vi } from 'vitest'

import { mockComputerServer } from '../../test-support/computer-mcp'
import { turn } from '../../test-support/harness'
import { instructionProviders } from '../../test-support/instructions'
import { wireFixture } from '../../test-support/wire'
import { Runner } from '../runner'
import { EventStore } from '../state'
import * as environment from './environment'

beforeEach(() => {
  mockComputerServer()
  vi.spyOn(environment, 'prepareProviderHome').mockResolvedValue()
})

const original = { workspaceBranch: 'owner/old', targetBranch: 'main' }
const current = { workspaceBranch: 'owner/new', targetBranch: 'trunk' }
const fixed =
  'Fixed instructions.\n\nWorkspace branch: "owner/old"\n\nTarget branch: "main"'
const line = 'Current branches: workspace "owner/new"; target "trunk".'

it.each(['claude', 'codex'] as const)(
  'keeps %s fixed branch identity after restart and adds current context only to provider input',
  async (agent) => {
    const h = await wireFixture()
    await h.runner.close()
    await h.store.remember({
      sessionId: 'session-1',
      agent,
      providerSessionId: 'saved-conversation',
      instructions: fixed,
    })
    const provider = instructionProviders(agent)
    let store = await EventStore.open(h.storage)
    const options = {
      ...h.options,
      workspaceBranch: 'stale/launch',
      defaultBranch: 'stale-main',
      providers: { ...h.options.providers, [agent]: provider.open },
    }
    let runner = new Runner({ ...options, store })
    onTestFinished(() => runner.close())
    await runner.start(false)
    const input = { ...turn('continued', 'bob', agent), branches: current }
    const unchanged = structuredClone(input)
    h.endpoint.send(input)
    await runner.idle()
    expect(provider.prompt()).toBe(fixed)
    const text = `Sender: @bob\n${line}\n\nChange the file.`
    expect(await provider.input()).toMatchObject(
      agent === 'claude'
        ? { role: 'user', content: text }
        : { input: [{ type: 'text', text, text_elements: [] }] },
    )
    expect(input).toEqual(unchanged)
    expect(store.snapshot.sessions[0]).toMatchObject({
      instructions: fixed,
      instructionBranches: original,
    })
    await runner.close()
    store = await EventStore.open(h.storage)
    runner = new Runner({
      ...options,
      workspaceBranch: current.workspaceBranch,
      defaultBranch: current.targetBranch,
      store,
    })
    await runner.start(false)
    h.endpoint.send({ ...turn('restart', 'bob', agent), branches: current })
    await runner.idle()
    expect(provider.prompt()).toBe(fixed)
    expect(await provider.input()).toMatchObject(
      agent === 'claude'
        ? { content: text }
        : { input: [{ type: 'text', text, text_elements: [] }] },
    )
    expect(store.snapshot.sessions[0]).toMatchObject({
      instructionBranches: original,
    })
    await store.remember({
      sessionId: 'opaque-session',
      agent,
      providerSessionId: null,
      instructions: 'Unchanged legacy instructions.',
    })
    const opaque = {
      ...turn('opaque', 'bob', agent),
      sessionId: 'opaque-session',
      branches: current,
    }
    opaque.message.sessionId = 'opaque-session'
    h.endpoint.send(opaque)
    await runner.idle()
    expect(provider.prompt()).toBe('Unchanged legacy instructions.')
    expect(await provider.input()).toMatchObject(
      agent === 'claude'
        ? { content: text }
        : { input: [{ type: 'text', text, text_elements: [] }] },
    )
    expect(
      store.snapshot.sessions.find(
        (session) => session.sessionId === 'opaque-session',
      ),
    ).toMatchObject({
      instructions: 'Unchanged legacy instructions.',
      instructionBranches: null,
    })
    expect(JSON.stringify(h.endpoint.events)).not.toContain('Current branches:')
  },
)

it.each(['claude', 'codex'] as const)(
  'builds new %s instructions from command branches and notices a target change during the turn',
  async (agent) => {
    const h = await wireFixture()
    await h.runner.close()
    const provider = instructionProviders(agent)
    const runner = new Runner({
      ...h.options,
      workspaceBranch: 'stale/launch',
      defaultBranch: 'stale-main',
      providers: { ...h.options.providers, [agent]: provider.open },
    })
    onTestFinished(() => runner.close())
    await runner.start(false)
    const first = { ...turn('new', 'alice', agent), branches: original }
    h.endpoint.send(first)
    await runner.idle()
    expect(provider.prompt()).toContain('Workspace branch: "owner/old"')
    expect(provider.prompt()).toContain('Target branch: "main"')
    expect(await provider.input()).toMatchObject(
      agent === 'claude'
        ? { content: 'Sender: @alice\n\nChange the file.' }
        : {
            input: [
              {
                type: 'text',
                text: 'Sender: @alice\n\nChange the file.',
                text_elements: [],
              },
            ],
          },
    )
    h.endpoint.send({
      ...turn('during', 'bob', agent),
      type: 'message',
      turnId: first.turnId,
      branches: { ...original, targetBranch: 'trunk' },
    })
    await runner.idle()
    const text =
      'Sender: @bob\nCurrent branches: workspace "owner/old"; target "trunk".\n\nChange the file.'
    expect(await provider.input(true)).toMatchObject(
      agent === 'claude'
        ? { content: text }
        : { input: [{ type: 'text', text, text_elements: [] }] },
    )
    expect(h.store.snapshot.sessions[0]).toMatchObject({
      instructionBranches: original,
    })
  },
)
