import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import {
  retryMessagePath,
  sessionPaths,
  sessionsPath,
} from '../../src/shared/sessions'
import { chatHistoryPath } from '../../src/shared/events'
import { routeChat } from '../chat/router'
import {
  createHarness,
  TEST_ORIGIN,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { ACTIVITY_WRITE_INTERVAL_MS, recordUserActivity } from './user-activity'

let harness: TestHarness
let cookie: string
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
  cookie = await harness.login()
})
afterAll(async () => harness.dispose())

async function userId(): Promise<string> {
  const row = await harness.env.DB.prepare(
    'SELECT id FROM users WHERE github_id = 7',
  ).first<{ id: string }>()
  if (!row) throw new Error('The signed-in user is missing.')
  return row.id
}

async function lastActive(): Promise<number | null> {
  const row = await harness.env.DB.prepare(
    'SELECT last_active_at AS at FROM users WHERE github_id = 7',
  ).first<{ at: number | null }>()
  return row?.at ?? null
}

it('writes the time at most once in the interval', async () => {
  const id = await userId()
  expect(await lastActive()).toBeNull()
  await recordUserActivity(harness.env.DB, id, TEST_TIME)
  expect(await lastActive()).toBe(TEST_TIME)
  await recordUserActivity(harness.env.DB, id, TEST_TIME + 30_000)
  expect(await lastActive()).toBe(TEST_TIME)
  const later = TEST_TIME + ACTIVITY_WRITE_INTERVAL_MS
  await recordUserActivity(harness.env.DB, id, later)
  expect(await lastActive()).toBe(later)
})

it('hands the write to the execution context when one is given', async () => {
  const pending: Promise<unknown>[] = []
  await recordUserActivity(harness.env.DB, await userId(), TEST_TIME, {
    waitUntil: (promise) => pending.push(promise),
  })
  expect(pending).toHaveLength(1)
  await Promise.all(pending)
  expect(await lastActive()).toBe(TEST_TIME)
})

it('warns and does not fail when the write fails', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const failing = {
    prepare: () => ({
      bind: () => ({ run: () => Promise.reject(new Error('D1 is down')) }),
    }),
  } as unknown as D1Database
  await expect(
    recordUserActivity(failing, 'user', TEST_TIME),
  ).resolves.toBeUndefined()
  expect(warn).toHaveBeenCalledWith(
    expect.objectContaining({ kind: 'user_activity_failed' }),
  )
  warn.mockRestore()
})

it('counts only a successful send or retry of a chat message', async () => {
  let status = 202
  const forwarded: string[] = []
  const env = {
    ...harness.env,
    WORKSPACES: {
      idFromName: (name: string) => name,
      get: () => ({
        fetch: (request: Request) => {
          forwarded.push(`${request.method} ${new URL(request.url).pathname}`)
          return Promise.resolve(new Response('{}', { status }))
        },
      }),
    },
  } as unknown as typeof harness.env
  const dependencies = { now: () => TEST_TIME, randomToken: () => 'token' }
  const counts = async (path: string, method: string, answer: number) => {
    status = answer
    await harness.env.DB.prepare('UPDATE users SET last_active_at = NULL').run()
    const response = await routeChat(
      new Request(`${TEST_ORIGIN}${path}`, {
        method,
        headers: { Cookie: cookie, Origin: TEST_ORIGIN },
        ...(method === 'GET' ? {} : { body: '{}' }),
      }),
      env,
      dependencies,
    )
    expect(response?.status).toBe(answer)
    return (await lastActive()) === TEST_TIME
  }
  const messages = sessionPaths.messages('org', 'workspace', 'session')
  expect(await counts(messages, 'POST', 202)).toBe(true)
  expect(
    await counts(
      retryMessagePath('org', 'workspace', 'session', 'message'),
      'POST',
      202,
    ),
  ).toBe(true)
  expect(await counts(messages, 'POST', 409)).toBe(false)
  expect(await counts(sessionsPath('org', 'workspace'), 'POST', 201)).toBe(
    false,
  )
  expect(
    await counts(chatHistoryPath('org', 'workspace', 'session'), 'GET', 200),
  ).toBe(false)
  expect(forwarded).toHaveLength(5)
})
