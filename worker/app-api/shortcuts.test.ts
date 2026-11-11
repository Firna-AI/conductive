import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { ACCOUNT_PATHS } from '../../src/shared/account'
import { readSaveShortcutsResponse } from '../../src/shared/shortcut-read'
import { createHarness, type TestHarness } from '../test-support/harness'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
  harness.env.CONDUCTIVE_DEFAULT_CHOICE = JSON.stringify({
    agent: 'claude',
    model: 'test-claude',
    effort: 'high',
  })
})
afterAll(async () => harness.dispose())

function save(cookie: string, body: unknown) {
  return harness.request(ACCOUNT_PATHS.shortcuts, cookie, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

async function expectAccountShortcuts(cookie: string, shortcuts: unknown) {
  const response = await harness.request(ACCOUNT_PATHS.account, cookie)
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({ shortcuts })
}

it('saves ordered shortcut changes, keeps empty overrides, and resets only the chosen keyboard', async () => {
  const cookie = await harness.login()
  await expectAccountShortcuts(cookie, { mac: [], other: [] })
  const other = [
    { command: 'command-palette', keys: ['Ctrl+P'] },
    { command: 'restore-workspace', keys: ['Alt+Shift+R'] },
    { command: 'send-feedback', keys: ['Alt+Shift+F'] },
  ]
  const otherSaved = await save(cookie, { keyboard: 'other', changes: other })
  expect(otherSaved.status).toBe(200)
  expect(readSaveShortcutsResponse(await otherSaved.json())).toEqual({
    keyboard: 'other',
    changes: other,
  })
  const changes = [
    { command: 'command-palette', keys: ['Meta+P', 'Ctrl+Alt+Meta+P'] },
    { command: 'new-session', keys: ['Alt+Meta+T'] },
  ]
  const saved = await save(cookie, { keyboard: 'mac', changes })
  expect(saved.status).toBe(200)
  expect(readSaveShortcutsResponse(await saved.json())).toEqual({
    keyboard: 'mac',
    changes,
  })
  await expectAccountShortcuts(cookie, { mac: changes, other })

  const empty = await save(cookie, {
    keyboard: 'mac',
    changes: [{ command: 'command-palette', keys: [] }],
  })
  const removed = [{ command: 'command-palette', keys: [] }, changes[1]]
  expect(empty.status).toBe(200)
  expect(readSaveShortcutsResponse(await empty.json())).toEqual({
    keyboard: 'mac',
    changes: removed,
  })
  await expectAccountShortcuts(cookie, { mac: removed, other })

  const reset = await save(cookie, {
    keyboard: 'mac',
    changes: [
      { command: 'command-palette', keys: null },
      { command: 'new-session', keys: null },
    ],
  })
  expect(reset.status).toBe(200)
  expect(readSaveShortcutsResponse(await reset.json())).toEqual({
    keyboard: 'mac',
    changes: [],
  })
  await expectAccountShortcuts(cookie, { mac: [], other })
  expect(
    await harness.env.DB.prepare(
      "SELECT COUNT(*) AS count FROM user_shortcuts WHERE keyboard = 'mac'",
    ).first('count'),
  ).toBe(0)
})

it('rejects a shortcut batch with one wrong change without saving any member', async () => {
  const cookie = await harness.login()
  const existing = [{ command: 'command-palette', keys: ['Meta+P'] }]
  expect(
    (await save(cookie, { keyboard: 'mac', changes: existing })).status,
  ).toBe(200)
  const invalid = [
    {
      change: { command: 'retired-command', keys: ['Meta+N'] },
      message: 'Choose a shortcut command.',
    },
    {
      change: { command: 'new-session', keys: ['not a shortcut'] },
      message: 'Choose a valid shortcut key.',
    },
    {
      change: {
        command: 'new-session',
        keys: ['Meta+N', 'Alt+Meta+N', 'Ctrl+Meta+N', 'Shift+Meta+N', 'F2'],
      },
      message: 'Choose at most four keys for a command.',
    },
  ]
  for (const { change, message } of invalid) {
    const response = await save(cookie, {
      keyboard: 'mac',
      changes: [{ command: 'command-palette', keys: [] }, change],
    })
    expect(response.status, message).toBe(400)
    expect(await response.json()).toEqual({
      error: { code: 'invalid_input', message },
    })
    await expectAccountShortcuts(cookie, { mac: existing, other: [] })
  }
})

it('rejects a fixed shortcut key without changing the account', async () => {
  const cookie = await harness.login()
  for (const key of ['Meta+R', 'Space']) {
    const response = await save(cookie, {
      keyboard: 'mac',
      changes: [{ command: 'command-palette', keys: [key] }],
    })
    expect.soft(response.status, key).toBe(400)
    expect.soft(await response.json(), key).toEqual({
      error: {
        code: 'invalid_input',
        message: 'Choose a key that is not fixed.',
      },
    })
  }
  await expectAccountShortcuts(cookie, { mac: [], other: [] })
})

it('omits retired or unreadable stored changes from account and save replies', async () => {
  const cookie = await harness.login()
  const changes = [{ command: 'command-palette', keys: ['Meta+P'] }]
  expect((await save(cookie, { keyboard: 'mac', changes })).status).toBe(200)
  const userId = await harness.env.DB.prepare(
    'SELECT id FROM users WHERE github_id = 7',
  ).first<string>('id')
  await harness.env.DB.batch(
    ['mac', 'other'].map((keyboard) =>
      harness.env.DB.prepare(
        'INSERT INTO user_shortcuts (user_id, keyboard, command, keys_json) VALUES (?, ?, ?, ?)',
      ).bind(userId, keyboard, 'retired-command', '[]'),
    ),
  )
  await expectAccountShortcuts(cookie, { mac: changes, other: [] })
  const saved = await save(cookie, { keyboard: 'mac', changes: [] })
  expect(saved.status).toBe(200)
  expect(await saved.json()).toEqual({ keyboard: 'mac', changes })

  const older = [
    [
      'command-palette',
      JSON.stringify([
        'Meta+P',
        'Meta+R',
        'not a current key',
        'Ctrl+Alt+Meta+P',
      ]),
    ],
    ['model-picker', JSON.stringify(['Meta+R', 'not a current key'])],
    [
      'go-to-checks',
      JSON.stringify([
        'Meta+Enter',
        'Ctrl+Shift+Enter',
        'NumpadEnter',
        'Space',
      ]),
    ],
    ['stop-agent', JSON.stringify(['Meta+NumpadDivide'])],
    ['new-session', '[]'],
    ['go-to-terminal', '{'],
  ]
  await harness.env.DB.batch(
    older.map(([command, keys]) =>
      harness.env.DB.prepare(
        `INSERT INTO user_shortcuts (user_id, keyboard, command, keys_json)
         VALUES (?, 'mac', ?, ?) ON CONFLICT(user_id, keyboard, command)
         DO UPDATE SET keys_json = excluded.keys_json`,
      ).bind(userId, command, keys),
    ),
  )
  const recovered = [
    { command: 'command-palette', keys: ['Meta+P', 'Ctrl+Alt+Meta+P'] },
    { command: 'new-session', keys: [] },
  ]
  await expectAccountShortcuts(cookie, { mac: recovered, other: [] })
  const confirmed = await save(cookie, { keyboard: 'mac', changes: [] })
  expect(confirmed.status).toBe(200)
  expect(await confirmed.json()).toEqual({
    keyboard: 'mac',
    changes: recovered,
  })
})
