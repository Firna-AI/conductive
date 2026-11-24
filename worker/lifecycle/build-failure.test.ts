import { afterEach, expect, it, vi } from 'vitest'

import { isRecord } from '../http'
import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { failBuild, readBuild, writeBuildLog } from './build-data'
import { failUnscheduledBuild } from './image-build-failure'
import { startImageBuild } from './image-builds'
import { INSTALLATION_TOKEN } from './image-sources/native-github-test-support'
import { parallelFixture } from './image-sources/parallel-test-support'

const fixtureForTest = setupBackendTests()
afterEach(() => vi.restoreAllMocks())

it('keeps the original failure log after a late scheduling failure and permits cleanup diagnostics', async () => {
  const fixture = fixtureForTest()
  const { images, org, user, runtime } = fixture
  const db = runtime.env.DB
  const id = await startImageBuild(images, {
    orgId: org.id,
    userId: user.id,
    kind: 'build',
    software: SOFTWARE,
  })
  await failBuild(
    db,
    id,
    'The cloud computer image could not build. Check the log and try again.',
    TEST_TIME + 1,
  )
  await fixture.setTime(TEST_TIME + 2)
  await failUnscheduledBuild(images, id)
  await writeBuildLog(db, id, 'Cleanup diagnostic.\n', TEST_TIME + 3)

  const failed = await readBuild(db, org.id, id)
  expect(failed.build).toMatchObject({
    state: 'failed',
    completedAt: TEST_TIME + 1,
    durationMs: 1,
    error:
      'The cloud computer image could not build. Check the log and try again.',
  })
  expect(failed.log).toEqual([
    {
      eventNumber: 1,
      occurredAt: TEST_TIME + 1,
      text: 'The cloud computer image could not build. Check the log and try again.',
    },
    {
      eventNumber: 2,
      occurredAt: TEST_TIME + 3,
      text: 'Cleanup diagnostic.\n',
    },
  ])
})

it('warns with the first repository failure after token cleanup finishes on a later alarm', async () => {
  const fixture = await parallelFixture(fixtureForTest().harness)
  const { access, input } = fixture
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const repositoryName = input.repositories[1].fullName
  const responseText = 'private GitHub response text'
  const fetch = access.fetch
  let blockRevoke = true
  vi.spyOn(access, 'fetch').mockImplementation(async (request) => {
    if (request.method === 'POST') {
      const body: unknown = await request.clone().json()
      if (
        isRecord(body) &&
        Array.isArray(body.repository_ids) &&
        body.repository_ids.length === 1 &&
        body.repository_ids[0] === 102
      )
        return new Response(
          `${responseText} ${repositoryName} ${INSTALLATION_TOKEN}`,
          { status: 422 },
        )
    }
    if (
      blockRevoke &&
      request.method === 'DELETE' &&
      request.headers.get('Authorization') === `Bearer ${INSTALLATION_TOKEN}_2`
    )
      return new Response(null, { status: 503 })
    return fetch(request)
  })

  await fixture.advance()
  await fixture.advance()
  expect(await fixture.advance()).toBe(false)
  expect(await fixture.job()).toMatchObject({
    state: 'running',
    phase: 'sources',
  })
  expect(access.activeTokens).toEqual([`${INSTALLATION_TOKEN}_2`])
  expect(warn).not.toHaveBeenCalled()

  blockRevoke = false
  await fixture.advance()
  expect(await fixture.job()).toMatchObject({
    state: 'failed',
    phase: 'cleanup',
  })
  expect(
    (await readBuild(fixture.env.DB, input.orgId, input.buildId)).build.error,
  ).toBe(
    'The repositories could not load. Check the GitHub App access and try again.',
  )
  expect(access.activeTokens).toEqual([])
  expect(warn).toHaveBeenCalledExactlyOnceWith({
    kind: 'image_build_failed',
    message: 'An image build failed.',
    buildId: 'unknown',
    phase: 'sources',
    sourceStep: 'source_token',
    githubStatus: 422,
    error: { kind: 'http', status: 502, code: 'image_sources_unavailable' },
  })
  for (const marker of [INSTALLATION_TOKEN, repositoryName, responseText])
    expect(JSON.stringify(warn.mock.calls)).not.toContain(marker)
})
