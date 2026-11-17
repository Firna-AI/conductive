import { expect, it } from 'vitest'

import { terminalPaths } from '../../src/shared/terminal'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { record } from '../chat/inputs'
import {
  addTerminal,
  setupTerminalListTests,
  terminalListPath,
  terminalPath,
  terminalStatePath,
} from './terminal-list.test-support'

const suite = setupTerminalListTests()

it('adds independent terminals without starting shells and keeps legacy terminal fields', async () => {
  const active = await suite.create()
  const first = {
    id: 'workspace',
    number: 1,
    socketPath: terminalPaths.terminalSocket(
      OUTER_ORG,
      OUTER_WORKSPACE,
      'workspace',
    ),
  }
  expect(await (await active.request(terminalStatePath)).json()).toEqual({
    state: 'ready',
    protocol: 'tty',
    socketPath: terminalPaths.socket(OUTER_ORG, OUTER_WORKSPACE),
    terminals: [first],
    several: true,
    eventNumber: 0,
  })
  const second = await addTerminal(active)
  const third = await addTerminal(active)
  expect(second).toEqual({
    id: expect.stringMatching(/^[a-f0-9]{32}$/),
    number: 2,
    socketPath: terminalPaths.terminalSocket(
      OUTER_ORG,
      OUTER_WORKSPACE,
      second.id,
    ),
  })
  expect(third.number).toBe(3)
  expect(third.id).not.toBe(second.id)
  expect(
    record(await (await active.request(terminalStatePath)).json()).terminals,
  ).toEqual([first, second, third])
  expect(active.boat.commands).toEqual([])
  await active.control('stopped')
  const wake = await active.hibernate()
  expect(wake.after.instance).not.toBe(wake.before.instance)
  expect(
    record(await (await active.request(terminalStatePath)).json()).terminals,
  ).toEqual([first, second, third])
  for (const state of ['stopped', 'ready']) {
    await active.env.DB.prepare('UPDATE workspaces SET state = ? WHERE id = ?')
      .bind(state, OUTER_WORKSPACE)
      .run()
    expect(
      record(await (await active.request(terminalStatePath)).json()).terminals,
    ).toEqual([first, second, third])
  }
})

it('uses the lowest free number in sorted order and refuses an eleventh terminal', async () => {
  const active = await suite.create()
  const second = await addTerminal(active)
  const third = await addTerminal(active)
  const closed = await active.request(terminalPath(second.id), {
    method: 'DELETE',
    body: '{}',
  })
  expect(closed.status).toBe(200)
  const replacement = await addTerminal(active)
  expect(replacement.number).toBe(2)
  expect(replacement.id).not.toBe(second.id)
  const terminals = [replacement, third]
  for (let number = 4; number <= 10; number++)
    terminals.push(await addTerminal(active))
  expect(
    record(await (await active.request(terminalStatePath)).json()).terminals,
  ).toEqual([
    expect.objectContaining({ id: 'workspace', number: 1 }),
    ...terminals,
  ])
  const limited = await active.request(terminalListPath, {
    method: 'POST',
    body: '{}',
  })
  expect(limited.status).toBe(409)
  expect(await limited.json()).toMatchObject({
    error: { code: 'terminal_limit' },
  })
  expect(await active.actor().readChatWorkspaceSummary()).toMatchObject({
    throughEventNumber: 11,
  })
})

it('keeps the entry after a failed close and permits the next close attempt', async () => {
  const active = await suite.create()
  const second = await addTerminal(active)
  active.boat.synchronousExitCode = 1
  const failed = await active.request(terminalPath(second.id), {
    method: 'DELETE',
    body: '{}',
  })
  expect(failed.status).toBe(502)
  expect(await failed.json()).toEqual({
    error: {
      code: 'sandbox_unavailable',
      message: 'The cloud computer did not answer. Try again.',
    },
  })
  expect(
    record(await (await active.request(terminalStatePath)).json()).terminals,
  ).toContainEqual(second)
  expect(await active.actor().readChatWorkspaceSummary()).toMatchObject({
    throughEventNumber: 1,
  })
  active.boat.synchronousExitCode = 0
  expect(
    (
      await active.request(terminalPath(second.id), {
        method: 'DELETE',
        body: '{}',
      })
    ).status,
  ).toBe(200)
  expect(active.boat.commands).toHaveLength(2)
  expect(await active.actor().readChatWorkspaceSummary()).toMatchObject({
    throughEventNumber: 2,
  })
})

it('marks closing before the command, prevents duplicate closes, and reserves the last terminal', async () => {
  const active = await suite.create()
  const second = await addTerminal(active)
  const last = await active.request(terminalPath(second.id), {
    method: 'DELETE',
    body: '{}',
  })
  expect(last.status).toBe(200)
  const refused = await active.request(terminalPath('workspace'), {
    method: 'DELETE',
    body: '{}',
  })
  expect(refused.status).toBe(409)
  expect(await refused.json()).toMatchObject({
    error: { code: 'terminal_last' },
  })
  const remaining = await addTerminal(active)
  let enter = () => {}
  let release = () => {}
  const entered = new Promise<void>((resolve) => {
    enter = resolve
  })
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  active.boat.beforeCommand = async () => {
    enter()
    await held
  }
  const pending = active.request(terminalPath('workspace'), {
    method: 'DELETE',
    body: '{}',
  })
  await entered
  try {
    const duplicate = await active.request(terminalPath('workspace'), {
      method: 'DELETE',
      body: '{}',
    })
    expect(duplicate.status).toBe(409)
    expect(await duplicate.json()).toMatchObject({
      error: { code: 'terminal_closing' },
    })
    const other = await active.request(terminalPath(remaining.id), {
      method: 'DELETE',
      body: '{}',
    })
    expect(other.status).toBe(409)
    expect(await other.json()).toMatchObject({
      error: { code: 'terminal_last' },
    })
    const entries = record(
      await (await active.request(terminalStatePath)).json(),
    ).terminals
    expect(entries).toEqual([
      expect.objectContaining({ id: 'workspace' }),
      expect.objectContaining({ number: 2 }),
    ])
    expect(active.boat.commands).toHaveLength(2)
    const open = await addTerminal(active)
    expect(open.number).toBe(3)
  } finally {
    release()
  }
  expect((await pending).status).toBe(200)
  expect(active.boat.commands.at(-1)).toContain('=workspace')
  const retry = await active.request(terminalPath('workspace'), {
    method: 'DELETE',
    body: '{}',
  })
  expect(retry.status).toBe(404)
  expect(await retry.json()).toMatchObject({
    error: { code: 'terminal_not_found' },
  })
  expect(active.boat.commands).toHaveLength(2)
})
