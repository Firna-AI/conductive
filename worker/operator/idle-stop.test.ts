import { expect, it } from 'vitest'

import { operatorIdleStopPath } from '../../src/shared/operator-idle-stop'
import { TEST_TIME } from '../test-support/harness'
import { setupProviderTests } from './providers.test-support'
import { operatorWrite } from './waitlist.test-support'

const fixtureForTest = setupProviderTests()
const path = operatorIdleStopPath()

async function eventCount(db: D1Database): Promise<unknown> {
  return db.prepare('SELECT COUNT(*) FROM idle_stop_events').first('COUNT(*)')
}

it('gates stop time reads and writes with the app session and operator identity', async () => {
  const harness = fixtureForTest()
  const cookie = await harness.login()
  expect((await harness.fetch(path)).status).toBe(401)
  for (const operators of ['8', undefined]) {
    harness.env.OPERATOR_GITHUB_IDS = operators
    for (const init of [{}, operatorWrite({ minutes: 60 }, 'PUT')]) {
      const reply = await harness.request(path, cookie, init)
      expect(reply.status).toBe(403)
      expect(await reply.json()).toEqual({
        error: {
          code: 'operator_required',
          message: 'Operator access is required.',
        },
      })
    }
  }
  expect(await eventCount(harness.env.DB)).toBe(0)
})

it('reads the default of 30 minutes before any change', async () => {
  const harness = fixtureForTest()
  const cookie = await harness.login()
  const reply = await harness.request(path, cookie)
  expect(reply.status).toBe(200)
  expect(await reply.json()).toEqual({
    minutes: 30,
    updatedAt: null,
    operator: null,
  })
})

it('records each real change with its operator and time and keeps equal repeats', async () => {
  const harness = fixtureForTest()
  const cookie = await harness.login()
  const update = (minutes: unknown, session = cookie) =>
    harness.request(path, session, operatorWrite({ minutes }, 'PUT'))
  expect(await (await update(30)).json()).toEqual({
    minutes: 30,
    updatedAt: null,
    operator: null,
  })
  harness.setTime(TEST_TIME + 10)
  const first = await update(90)
  expect(first.status).toBe(200)
  const saved = {
    minutes: 90,
    updatedAt: TEST_TIME + 10,
    operator: { githubId: 7, login: 'octocat' },
  }
  expect(await first.json()).toEqual(saved)
  harness.github.profile = { id: 8, login: 'other-operator' }
  const other = await harness.login()
  harness.env.OPERATOR_GITHUB_IDS = '7,8'
  harness.setTime(TEST_TIME + 20)
  expect(await (await update(90, other)).json()).toEqual(saved)
  expect(await (await harness.request(path, cookie)).json()).toEqual(saved)
  harness.setTime(TEST_TIME + 30)
  expect(await (await update(15, other)).json()).toEqual({
    minutes: 15,
    updatedAt: TEST_TIME + 30,
    operator: { githubId: 8, login: 'other-operator' },
  })
  expect(
    (
      await harness.env.DB.prepare(
        `SELECT e.minutes AS minutes, e.changed_at AS at, u.github_id AS actor
         FROM idle_stop_events e LEFT JOIN users u ON u.id = e.operator_user_id
         ORDER BY e.id`,
      ).all()
    ).results,
  ).toEqual([
    { minutes: 90, at: TEST_TIME + 10, actor: 7 },
    { minutes: 15, at: TEST_TIME + 30, actor: 8 },
  ])
})

it('refuses every time that is not one of the choices before writing', async () => {
  const harness = fixtureForTest()
  const cookie = await harness.login()
  for (const minutes of [0, 5, 45, 121, 240, 30.5, '30', null, undefined]) {
    const reply = await harness.request(
      path,
      cookie,
      operatorWrite({ minutes }, 'PUT'),
    )
    expect(reply.status, String(minutes)).toBe(400)
    expect(await reply.json()).toEqual({
      error: {
        code: 'invalid_input',
        message: 'Choose 15, 30, 60, 90, or 120 minutes.',
      },
    })
  }
  expect(await eventCount(harness.env.DB)).toBe(0)
  expect(
    await harness.env.DB.prepare(
      'SELECT minutes FROM idle_stop_settings WHERE id = 1',
    ).first('minutes'),
  ).toBe(30)
})

it('reads a missing or invalid row as the default, and a save repairs it', async () => {
  const harness = fixtureForTest()
  const cookie = await harness.login()
  await harness.env.DB.prepare(
    'UPDATE idle_stop_settings SET minutes = 7 WHERE id = 1',
  ).run()
  expect(await (await harness.request(path, cookie)).json()).toMatchObject({
    minutes: 30,
  })
  await harness.env.DB.prepare('DELETE FROM idle_stop_settings').run()
  expect(await (await harness.request(path, cookie)).json()).toMatchObject({
    minutes: 30,
  })
  const reply = await harness.request(
    path,
    cookie,
    operatorWrite({ minutes: 120 }, 'PUT'),
  )
  expect(await reply.json()).toMatchObject({ minutes: 120 })
  expect(await eventCount(harness.env.DB)).toBe(1)
})
