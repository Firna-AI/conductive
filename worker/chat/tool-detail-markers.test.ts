import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { createHarness, type TestHarness } from '../test-support/harness'
import { outputFixture } from './runner-output.test-support'
import {
  heldScenario,
  readHeldTool,
  saveHeldTemporary,
  setHeldValues,
} from './tool-detail-held.test-support'
import { part } from './tool-detail.test-support'
import { workspaceSecretValuePath } from '../../src/shared/secret-requests'
import { WORKSPACE_ID } from './harness.test-support'

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

it('preserves marker identities and untouched arrival carry through held cleanup', async () => {
  const f = await outputFixture(harness, {})
  for (const scenario of [
    {
      name: 'S21 marker starts in run',
      first: 'x [',
      removed: '[',
      remaining: [],
      held: '[redacted]',
      middle: 'red',
      final: 'acted]|',
      expected: 'x [redacted]|',
    },
    {
      name: 'S17 marker continuation',
      first: 'x [reda',
      removed: 'reda',
      remaining: [],
      held: '[[redacted]',
      middle: 'ct',
      final: 'ed]|',
      expected: 'x [redacted]|',
    },
    {
      name: 'marker divergence',
      first: 'x [reda',
      removed: 'reda',
      remaining: [],
      held: '[[redacted]',
      final: '!',
      expected: 'x [[redacted]!',
    },
    {
      name: 'S18 arrival carry',
      first: 'x db://user:pa',
      removed: 'unrelated-temp',
      remaining: ['db://user:pass@host'],
      held: 'db://user:pa',
      middle: 'ss@host|',
      later: [],
      final: 'end',
      expected: 'x [redacted]|end',
    },
    {
      name: 'S20 untouched prefix',
      first: 'x short-token',
      removed: 'unrelated-temp',
      remaining: ['short-token', 'short-token-longer'],
      held: 'short-token',
      later: ['short-token', 'short-token-longer', 'short-token-longer-x'],
      final: '-longer-x|',
      expected: 'x [redacted]|',
    },
    {
      name: 'complete marker has its own fallback identity',
      first: 'x [redacted]',
      removed: 'reda',
      remaining: ['[redacted]-long'],
      held: '[[redacted]cted]',
      final: '!',
      expected: 'x [redacted]!',
    },
  ])
    await heldScenario(f, scenario)
  for (const boundary of ['ordinary save', 'unrelated cleanup']) {
    await setHeldValues(f, [])
    await saveHeldTemporary(f, 'unrelated-temp')
    await f.emit(part(f.context, 'x [redacted]', 1))
    if (boundary === 'unrelated cleanup') {
      const path = workspaceSecretValuePath(
        f.org.id,
        WORKSPACE_ID,
        'held-temporary',
      )
      expect(
        (await f.fetch(path, undefined, f.ownerCookie, 'DELETE')).status,
      ).toBe(204)
      expect.soft((await readHeldTool(f))?.held, boundary).toBe('[redacted]')
    }
    await setHeldValues(f, ['[redacted]-longer'])
    await f.emit(part(f.context, '-longer|', 2))
    await setHeldValues(f, [])
    await f.emit(part(f.context, 'end', 3, true))
    const history = await f.history(f.context.sessionId)
    expect.soft(history.events.at(-1)?.event, boundary).toMatchObject({
      type: 'tool.updated',
      tool: { detail: 'x [redacted]|end', omittedDetailBytes: 17 },
    })
  }
})
