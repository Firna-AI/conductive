import { expect, it } from 'vitest'

import { terminalPaths } from '../../src/shared/terminal'
import { workspacePath } from '../../src/shared/workspaces'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { record } from '../chat/inputs'
import {
  addTerminal,
  setupTerminalListTests,
  terminalEntry,
  terminalListPath,
  terminalPath,
  terminalStatePath,
} from './terminal-list.test-support'

const suite = setupTerminalListTests()

it('sends terminal changes to every tab in the common stream and replays them once after reconnect', async () => {
  const active = await suite.create()
  const tabs = [await suite.tab(active), await suite.tab(active)]
  for (const tab of tabs)
    expect(tab.history).toMatchObject({
      type: 'history',
      history: { events: [], throughEventNumber: 0 },
    })
  const response = await active.request(terminalListPath, {
    method: 'POST',
    body: '{}',
  })
  expect(response.status).toBe(201)
  const created = record(await response.json())
  const second = terminalEntry(created.terminal)
  const first = {
    id: 'workspace',
    number: 1,
    socketPath: terminalPaths.terminalSocket(
      OUTER_ORG,
      OUTER_WORKSPACE,
      'workspace',
    ),
  }
  expect(created).toEqual({
    terminal: second,
    terminals: [first, second],
    eventNumber: 1,
  })
  for (const tab of tabs)
    expect(await tab.inbox.next()).toMatchObject({
      type: 'event',
      envelope: {
        eventNumber: 1,
        event: { type: 'terminals.updated', terminals: [first, second] },
      },
    })
  expect(
    (
      await active.request(workspacePath(OUTER_ORG, OUTER_WORKSPACE), {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Terminal workspace' }),
      })
    ).status,
  ).toBe(200)
  for (const tab of tabs)
    expect(await tab.inbox.next()).toMatchObject({
      type: 'event',
      envelope: { eventNumber: 2, event: { type: 'workspace.updated' } },
    })
  expect(await (await active.request(terminalStatePath)).json()).toMatchObject({
    terminals: [first, second],
    eventNumber: 2,
  })
  const closed = await active.request(terminalPath(second.id), {
    method: 'DELETE',
    body: '{}',
  })
  expect(closed.status).toBe(200)
  expect(await closed.json()).toEqual({ terminals: [first], eventNumber: 3 })
  for (const tab of tabs)
    expect(await tab.inbox.next()).toMatchObject({
      type: 'event',
      envelope: {
        eventNumber: 3,
        event: { type: 'terminals.updated', terminals: [first] },
      },
    })
  expect(
    (
      await active.request(terminalPath(second.id), {
        method: 'DELETE',
        body: '{}',
      })
    ).status,
  ).toBe(404)
  const state = record(await (await active.request(terminalStatePath)).json())
  expect(state.terminals).toEqual([first])
  expect(state.eventNumber).toBe(3)
  const reconnected = await suite.tab(active, 1)
  expect(reconnected.history).toMatchObject({
    type: 'history',
    history: {
      throughEventNumber: 3,
      events: [
        { eventNumber: 2, event: { type: 'workspace.updated' } },
        {
          eventNumber: 3,
          event: { type: 'terminals.updated', terminals: [first] },
        },
      ],
    },
  })
  expect(await active.control('summary')).toMatchObject({
    throughEventNumber: 3,
  })
  const wake = await active.hibernate()
  expect(wake.after.instance).not.toBe(wake.before.instance)
  await addTerminal(active)
  for (const tab of [...tabs, reconnected])
    expect(await tab.inbox.next()).toMatchObject({
      type: 'event',
      envelope: {
        eventNumber: 4,
        event: {
          type: 'terminals.updated',
          terminals: [first, expect.objectContaining({ number: 2 })],
        },
      },
    })
})
