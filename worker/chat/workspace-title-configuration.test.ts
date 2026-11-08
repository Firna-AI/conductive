import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from 'vitest'

import { createHarness, type TestHarness } from '../test-support/harness'
import { WORKSPACE_ID } from './harness.test-support'
import { sessionRecord } from './retry.test-support'
import type { TitleModelCall } from './title-model'
import { createTitleFixture } from './workspace-title.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterEach(() => {
  vi.restoreAllMocks()
})
afterAll(async () => {
  await harness.dispose()
})

it.each(['model', 'binding'] as const)(
  'warns once per workspace object and keeps the city name when the %s is missing',
  async (missing) => {
    const run = vi.fn<TitleModelCall>()
    const warning = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined)
    const { fixture, first, acceptFirst, drain } = await createTitleFixture(
      harness,
      missing === 'binding' ? undefined : run,
    )
    if (missing === 'model') delete fixture.env.CONDUCTIVE_TITLE_MODEL
    await acceptFirst()
    await drain()
    await fixture.send(first.sessionId, 'without-title-config')
    await drain()
    expect(warning).toHaveBeenCalledTimes(1)
    expect(run).not.toHaveBeenCalled()
    expect((await sessionRecord(fixture, first.sessionId)).title).toBe('delft')
    expect(
      await fixture.env.DB.prepare('SELECT name FROM workspaces WHERE id = ?')
        .bind(WORKSPACE_ID)
        .first('name'),
    ).toBe('delft')
  },
)
