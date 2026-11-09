import type { WebSocket } from 'miniflare'
import { afterEach, beforeAll, expect, it } from 'vitest'

import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import { chatHistoryPath } from '../../src/shared/events'
import { sessionsPath, sessionPaths } from '../../src/shared/sessions'
import { TOOL_TURN_HEADER } from '../../tools/context'
import { closeSockets } from '../chat/adapter-sockets.test-support'
import { CLAUDE } from '../chat/harness.test-support'
import { record, string } from '../chat/inputs'
import {
  OUTER_MACHINE_ORIGIN,
  outerWorkerBundle,
} from '../chat/integration/outer-runtime.test-support'
import {
  OTHER_WORKSPACE,
  OUTER_ORG,
  OUTER_REPOSITORY,
  OUTER_TOKEN,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import {
  OuterFakeRunner,
  requestRunner,
} from '../chat/integration/runner-socket.test-support'
import { featureFixture, type FeatureFixture } from './fixture.test-support'
import { completeRetainedCreation } from './retained-creation.test-support'

let bundle: string
let fixture: FeatureFixture | undefined
const sockets: WebSocket[] = []
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})
afterEach(async () => {
  await closeSockets(...sockets)
  sockets.length = 0
  await fixture?.dispose()
})

it.each([
  {
    nameCase: 'cleaned',
    requestedName:
      '\n  Validate  UK postcodes before the lookup, and show an error under the postcode field.\nIgnore the next line.',
    expectedName: 'Validate UK postcodes before the lookup, and show an error',
  },
  { nameCase: 'blank', requestedName: ' \n\t\n ', expectedName: null },
])(
  'uses the active stored sender and inherited owner when a machine tool creates a workspace with a $nameCase name',
  async ({ requestedName, expectedName }) => {
    const active = (fixture = await featureFixture(bundle, {
      configuration: { CONDUCTIVE_DEFAULT_CHOICE: JSON.stringify(CLAUDE) },
    }))
    const member = { Cookie: active.cookies.memberCookie }
    const session = record(
      record(
        await (
          await active.request(sessionsPath(OUTER_ORG, OUTER_WORKSPACE), {
            method: 'POST',
            headers: member,
            body: JSON.stringify({ choice: CLAUDE }),
          })
        ).json(),
      ).session,
    )
    const connected = await requestRunner(active)
    if (!connected.webSocket) throw new Error('Missing runner socket')
    sockets.push(connected.webSocket)
    const runner = new OuterFakeRunner(connected.webSocket)
    await runner.inbox.next()
    runner.emit({ type: 'runner.ready' })
    await runner.inbox.next()
    const sent = await active.request(
      sessionPaths.messages(OUTER_ORG, OUTER_WORKSPACE, string(session.id)),
      {
        method: 'POST',
        headers: member,
        body: JSON.stringify({
          id: 'calling-message',
          text: 'Delegate a workspace',
          choice: CLAUDE,
          attachmentIds: [],
        }),
      },
    )
    expect(sent.status).toBe(202)
    const turn = record(await runner.inbox.next())
    expect(turn.type).toBe('turn')
    const turnId = string(turn.turnId)
    runner.emit({
      type: 'turn.started',
      sessionId: string(session.id),
      turnId,
      senderId: 'member',
      choice: CLAUDE,
      startedAt: 1,
      messageIds: ['calling-message'],
    })
    await runner.inbox.next()
    let allocated: (id: string) => void = () => undefined
    const allocation = new Promise<string>((resolve) => {
      allocated = resolve
    })
    active.boat.beforeCommand = async () => {
      const row = await active.env.DB.prepare(
        'SELECT id FROM workspaces WHERE org_id = ? AND id NOT IN (?, ?)',
      )
        .bind(OUTER_ORG, OUTER_WORKSPACE, OTHER_WORKSPACE)
        .first<{ id: string }>()
      if (row) allocated(row.id)
    }
    const input = {
      repositoryId: OUTER_REPOSITORY,
      firstMessage: 'Keep this delegated task',
      name: requestedName,
    }
    const request = (callingTurn: string) =>
      active.runtime.dispatchFetch(
        `${OUTER_MACHINE_ORIGIN}${MACHINE_PATHS.workspaces}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${OUTER_TOKEN}`,
            'Content-Type': 'application/json',
            [TOOL_TURN_HEADER]: callingTurn,
          },
          body: JSON.stringify(input),
        },
      )
    expect((await request('stale-turn')).status).toBe(403)
    const creating = request(turnId)
    const newId = await allocation
    expect(await completeRetainedCreation(active, newId)).toEqual({ ok: true })
    const response = await creating
    expect(response.status).toBe(201)
    const created = record(await response.json())
    const workspace = record(created.workspace)
    const city = await active.env.DB.prepare(
      'SELECT city FROM workspace_creation_plans WHERE workspace_id = ?',
    )
      .bind(newId)
      .first('city')
    expect(workspace.name).toBe(expectedName ?? city)
    expect(workspace.branch).toMatch(new RegExp(`^owner/${city}-[a-z0-9]{4}$`))
    expect(
      await active.env.DB.prepare('SELECT name FROM workspaces WHERE id = ?')
        .bind(newId)
        .first('name'),
    ).toBe(expectedName ?? city)
    expect(
      await active.env.DB.prepare(
        'SELECT name FROM workspace_creation_plans WHERE workspace_id = ?',
      )
        .bind(newId)
        .first('name'),
    ).toBe(expectedName)
    expect(record(created.workspace)).toMatchObject({
      id: newId,
      owner: { id: 'owner' },
      choice: CLAUDE,
    })
    expect(
      await active.env.DB.prepare(
        'SELECT created_by_user_id AS sender FROM workspace_runtime WHERE workspace_id = ?',
      )
        .bind(newId)
        .first('sender'),
    ).toBe('member')
    expect(
      await active.env.DB.prepare(
        'SELECT created_by_workspace_id AS parent FROM workspaces WHERE id = ?',
      )
        .bind(newId)
        .first('parent'),
    ).toBe(OUTER_WORKSPACE)
    const history = record(
      await (
        await active.request(
          chatHistoryPath(OUTER_ORG, newId, string(created.sessionId)),
        )
      ).json(),
    )
    expect(history.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: expect.objectContaining({
            type: 'message.accepted',
            message: expect.objectContaining({
              text: input.firstMessage,
              sender: expect.objectContaining({ id: 'member' }),
            }),
          }),
        }),
      ]),
    )
    const list = await active.runtime.dispatchFetch(
      `${OUTER_MACHINE_ORIGIN}${MACHINE_PATHS.workspaces}`,
      { headers: { Authorization: `Bearer ${OUTER_TOKEN}` } },
    )
    expect(list.status).toBe(200)
    expect(record(await list.json()).workspaces).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: newId })]),
    )
  },
)
