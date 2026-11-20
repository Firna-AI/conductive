import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { terminalPaths } from '../../src/shared/terminal'
import { createChatFixture, WORKSPACE_ID } from '../chat/harness.test-support'
import { createHarness, type TestHarness } from '../test-support/harness'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

it.each([
  {
    boundary: 'before' as const,
    createdCount: 1,
    createdEvents: 0,
    closedCount: 2,
    closedEvents: 1,
  },
  {
    boundary: 'after' as const,
    createdCount: 2,
    createdEvents: 1,
    closedCount: 1,
    closedEvents: 2,
  },
])(
  'commits terminal records and events together when a reply fails $boundary commit',
  async ({
    boundary,
    createdCount,
    createdEvents,
    closedCount,
    closedEvents,
  }) => {
    const fixture = await createChatFixture(harness)
    const orgId = fixture.org.id
    const terminalId = '0123456789abcdef0123456789abcdef'
    const first = {
      id: 'workspace',
      number: 1,
      socketPath: terminalPaths.terminalSocket(
        orgId,
        WORKSPACE_ID,
        'workspace',
      ),
    }
    const second = {
      id: terminalId,
      number: 2,
      socketPath: terminalPaths.terminalSocket(orgId, WORKSPACE_ID, terminalId),
    }
    const create = () =>
      fixture.changeWorkspace(WORKSPACE_ID, (transaction) =>
        transaction.terminals.create(orgId, WORKSPACE_ID, terminalId),
      )
    const close = () =>
      fixture.changeWorkspace(WORKSPACE_ID, (transaction) =>
        transaction.terminals.remove(orgId, WORKSPACE_ID, terminalId),
      )
    const list = () =>
      fixture.chat.readWorkspace(WORKSPACE_ID, (transaction) =>
        transaction.terminals.list(orgId, WORKSPACE_ID),
      )
    await fixture.failNextCommit(boundary, 'Injected terminal commit failure')
    await expect(create()).rejects.toThrow('Injected terminal commit failure')
    await fixture.clearFaults()
    expect(await list()).toHaveLength(createdCount)
    expect(await fixture.chat.workspaceSummary(WORKSPACE_ID)).toMatchObject({
      throughEventNumber: createdEvents,
    })
    expect(await create()).toEqual({
      terminal: second,
      terminals: [first, second],
    })
    expect(await create()).toEqual({
      terminal: second,
      terminals: [first, second],
    })
    await fixture.failNextCommit(boundary, 'Injected terminal commit failure')
    await expect(close()).rejects.toThrow('Injected terminal commit failure')
    await fixture.clearFaults()
    expect(await list()).toHaveLength(closedCount)
    expect(await fixture.chat.workspaceSummary(WORKSPACE_ID)).toMatchObject({
      throughEventNumber: closedEvents,
    })
    expect(await close()).toEqual({ terminals: [first] })
    expect(await close()).toEqual({ terminals: [first] })
    await fixture.restart()
    expect(await list()).toEqual([first])
    const history = await fixture.chat.readWorkspace(
      WORKSPACE_ID,
      (transaction) => transaction.history(0),
    )
    expect(history).toMatchObject({
      throughEventNumber: 2,
      events: [
        {
          eventNumber: 1,
          event: { type: 'terminals.updated', terminals: [first, second] },
        },
        {
          eventNumber: 2,
          event: { type: 'terminals.updated', terminals: [first] },
        },
      ],
    })
  },
)
