import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from 'vitest'

import { createHarness, type TestHarness } from '../../test-support/harness'
import { parallelFixture } from './parallel-test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterEach(() => vi.restoreAllMocks())
afterAll(async () => {
  await harness.dispose()
})

it.each([
  { phase: 'metadata', methods: [] },
  { phase: 'copy', methods: ['POST', 'GET', 'DELETE'] },
])(
  'reports changed repository values before $phase access',
  async ({ phase, methods }) => {
    const fixture = await parallelFixture(harness, { sizesKiB: [1] })
    const changeName = async () => {
      await fixture.env.DB.prepare(
        'UPDATE repositories SET full_name = ? WHERE id = ?',
      )
        .bind('example/renamed', fixture.input.repositories[0].id)
        .run()
    }
    await fixture.tick(2)
    if (phase === 'metadata') await changeName()
    else fixture.access.beforeMetadata = changeName
    await expect(fixture.prepare()).rejects.toMatchObject({
      sourceStep: 'repository_values',
      githubStatus: null,
    })
    expect(fixture.access.requests.map((request) => request.method)).toEqual(
      methods,
    )
  },
)

it('reports a failed repository layout command', async () => {
  const fixture = await parallelFixture(harness)
  await fixture.tick()
  fixture.processes[0].exitCode = 1
  await expect(fixture.prepare()).rejects.toMatchObject({
    sourceStep: 'layout',
    githubStatus: null,
  })
})

it('reports the GitHub status of a denied metadata read', async () => {
  const fixture = await parallelFixture(harness, { sizesKiB: [1] })
  const fetch = fixture.access.fetch
  vi.spyOn(fixture.access, 'fetch').mockImplementation(async (request) =>
    request.method === 'GET'
      ? new Response('private metadata response', { status: 404 })
      : fetch(request),
  )
  await fixture.tick(2)
  await expect(fixture.prepare()).rejects.toMatchObject({
    sourceStep: 'metadata_read',
    githubStatus: 404,
  })
  expect(fixture.access.activeTokens).toEqual([])
})

it('reports an unclassified error as an unknown step', async () => {
  const fixture = await parallelFixture(harness)
  await fixture.tick(2)
  await fixture.env.DB.prepare(
    'UPDATE image_source_runs SET metadata_plan_json = ? WHERE build_id = ?',
  )
    .bind('invalid JSON', fixture.input.buildId)
    .run()
  await expect(fixture.prepare()).rejects.toMatchObject({
    sourceStep: 'unknown',
    githubStatus: null,
  })
})
