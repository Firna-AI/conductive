import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { API_PATHS } from '../../src/shared/api'
import { terminalPaths } from '../../src/shared/terminal'
import { ManualChatClock } from '../chat/chat-clock.test-support'
import { createToolsHarness, type ToolsHarness } from '../previews/test-support'
import {
  activeMember,
  suspendWorkspaceOwner,
} from '../previews/suspension-test-support'
import { TEST_ORIGIN, TEST_TIME } from '../test-support/harness'
import { barrier } from '../previews/stream-test-support'
import { createTerminalHandler } from './handler'
import { startWorkspaceTerminal } from './service'

let harness: ToolsHarness
beforeAll(async () => {
  harness = await createToolsHarness()
})
beforeEach(async () => {
  await harness.resetTools()
})
afterAll(async () => {
  await harness.dispose()
})

async function fixture() {
  const seed = await harness.seed()
  await startWorkspaceTerminal(
    harness.env,
    seed.orgId,
    seed.workspaceId,
    harness.dependencies,
  )
  const clock = new ManualChatClock(TEST_TIME)
  const dependencies = {
    ...harness.dependencies,
    now: clock.now,
    terminalSchedule: clock.schedule,
  }
  const handler = createTerminalHandler(harness.env, dependencies)
  const open = async (session = seed.session) => {
    const response = await handler.fetch(
      new Request(
        `${TEST_ORIGIN}${terminalPaths.socket(seed.orgId, seed.workspaceId)}`,
        {
          headers: {
            Cookie: session,
            Origin: TEST_ORIGIN,
            Upgrade: 'websocket',
            'Sec-WebSocket-Protocol': 'tty',
          },
        },
      ),
    )
    expect(response.status).toBe(101)
    return {
      browser: harness.serverSockets.at(-1)!,
      upstream: harness.upstreamSockets.at(-1)!,
    }
  }
  return { ...seed, clock, handler, open }
}

it('closes idle terminals after sign-out, membership removal, and session expiry and removes their checks', async () => {
  const setup = await fixture()
  const signedOut = await setup.open()
  const freshCookie = await harness.login()
  const fresh = await setup.open(freshCookie)
  harness.github.profile = {
    id: 8,
    login: 'member',
    name: 'Member',
    avatar_url: null,
  }
  const memberCookie = await harness.login()
  const member = await harness.env.DB.prepare(
    'SELECT id FROM users WHERE github_id = 8',
  ).first<string>('id')
  await harness.env.DB.prepare(
    "INSERT INTO org_members (org_id,user_id,role,joined_at) VALUES (?,?,'member',?)",
  )
    .bind(setup.orgId, member, TEST_TIME)
    .run()
  const removed = await setup.open(memberCookie)
  await harness.request(API_PATHS.signOut, setup.session, {
    method: 'POST',
    body: '{}',
  })
  await harness.env.DB.prepare(
    'DELETE FROM org_members WHERE org_id = ? AND user_id = ?',
  )
    .bind(setup.orgId, member)
    .run()
  await setup.clock.advance(15_000)
  expect([
    signedOut.browser.closed?.code,
    removed.browser.closed?.code,
    fresh.browser.closed,
  ]).toEqual([1008, 1008, null])
  await harness.env.DB.prepare('UPDATE sessions SET expires_at = ?')
    .bind(setup.clock.now() + 30_000)
    .run()
  await setup.clock.advance(30_000)
  expect(fresh.browser.closed?.code).toBe(1008)
  expect(setup.clock.scheduledCount).toBe(0)
})

it('checks terminal frames against their live registration without reading D1 for each frame', async () => {
  const setup = await fixture()
  const peer = await setup.open()
  const database = harness.env.DB
  let reads = 0
  harness.env.DB = new Proxy(database, {
    get(target, name) {
      return name === 'prepare'
        ? (query: string) => {
            reads++
            return target.prepare(query)
          }
        : Reflect.get(target, name)
    },
  })
  const output = peer.browser.whenSent(3)
  peer.upstream.emit('one')
  peer.upstream.emit('two')
  peer.upstream.emit('three')
  await output
  expect(peer.browser.sent).toEqual(['one', 'two', 'three'])
  expect(reads).toBe(0)
  harness.env.DB = database
  peer.browser.close(1000, 'finished')
  await peer.upstream.end
  expect(setup.clock.scheduledCount).toBe(0)
})

it('closes idle terminals when the workspace or org no longer permits sandbox access', async () => {
  const setup = await fixture()
  for (const change of [
    "UPDATE workspaces SET state = 'stopped'",
    "UPDATE workspaces SET sandbox_id = 'bx_replaced'",
    'UPDATE workspaces SET archived_at = 1',
    'UPDATE orgs SET deleted_at = 1',
    'UPDATE orgs SET suspended_at = 1',
  ]) {
    const peer = await setup.open()
    await harness.env.DB.prepare(change).run()
    await setup.clock.advance(15_000)
    expect(peer.browser.closed?.code).toBe(1008)
    expect(setup.clock.scheduledCount).toBe(0)
    await harness.env.DB.batch([
      harness.env.DB.prepare(
        "UPDATE workspaces SET state = 'ready', sandbox_id = 'bx_one', archived_at = NULL",
      ),
      harness.env.DB.prepare(
        'UPDATE orgs SET deleted_at = NULL, suspended_at = NULL',
      ),
    ])
  }
})

it('expires an idle terminal grant while an access read waits and cannot revive the closed registration', async () => {
  const setup = await fixture()
  const peer = await setup.open()
  const entered = barrier<void>()
  const release = barrier<void>()
  const database = harness.env.DB
  const wrap = (statement: D1PreparedStatement): D1PreparedStatement =>
    new Proxy(statement, {
      get(target, name) {
        if (name === 'bind')
          return (...values: unknown[]) => wrap(target.bind(...values))
        if (name !== 'all') return Reflect.get(target, name)
        return async () => {
          const result = await target.all()
          entered.resolve()
          await release.promise
          return result
        }
      },
    })
  harness.env.DB = new Proxy(database, {
    get(target, name) {
      return name === 'prepare'
        ? (query: string) =>
            query.includes('connectionNumber')
              ? wrap(target.prepare(query))
              : target.prepare(query)
        : Reflect.get(target, name)
    },
  })
  const pending = setup.clock.advance(15_000)
  await entered.promise
  await setup.clock.advance(15_000)
  const expiredCode = peer.browser.closed?.code
  release.resolve()
  await pending
  expect(expiredCode).toBe(1008)
  expect(peer.upstream.closed?.code).toBe(1008)
  expect(setup.clock.scheduledCount).toBe(0)
  peer.upstream.emit('late output')
  expect(peer.browser.sent).toEqual([])
  harness.env.DB = database
})

it('closes an active member terminal when the workspace owner is suspended', async () => {
  const setup = await fixture()
  const member = await activeMember(harness, setup.orgId)
  const peer = await setup.open(member.session)
  await suspendWorkspaceOwner(harness, setup.workspaceId)
  await setup.clock.advance(15_000)
  expect(peer.browser.closed?.code).toBe(1008)
  expect(peer.upstream.closed?.code).toBe(1008)
  expect(setup.clock.scheduledCount).toBe(0)
})
