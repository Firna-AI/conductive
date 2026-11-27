import { afterEach, expect, it, vi } from 'vitest'

import { FakeE2b } from '../test-support/fake-e2b'
import { SOFTWARE } from './backend-test-support'
import { setupBackendTests } from './backend-test-hooks'
import { readBuild, readBuildHistory } from './build-data'
import { startImageBuild } from './image-builds'
import { STORAGE_COMMAND, readImageStorage } from './image-storage'
import { SECONDARY_IMAGE_ACCOUNT } from './org-image-account-test-support'
import { finishImageBuild as finish } from './image-test-support'

const backendFixture = setupBackendTests()

afterEach(() => {
  vi.restoreAllMocks()
})

async function build(fixture: ReturnType<typeof backendFixture>) {
  const { images, org, user } = fixture
  const id = await startImageBuild(images, {
    orgId: org.id,
    userId: user.id,
    kind: 'build',
    software: SOFTWARE,
  })
  await finish(fixture, id)
  return id
}

it('stores the free storage under the workspace disk line before the image saves', async () => {
  const fixture = backendFixture()
  const { boat, org, runtime } = fixture
  const id = await build(fixture)
  const storage = {
    storageTotalBytes: 68_534_575_104,
    storageFreeBytes: 31_534_575_104,
  }
  const history = await readBuildHistory(runtime.env.DB, org.id)
  expect(history.builds[0]).toMatchObject({ id, ...storage })
  expect((await readBuild(runtime.env.DB, org.id, id)).build).toMatchObject(
    storage,
  )
  const measured = boat.commands.indexOf(STORAGE_COMMAND)
  const cleared = boat.commands.findIndex((command) =>
    command.startsWith('rm -rf -- '),
  )
  expect(cleared).toBeGreaterThanOrEqual(0)
  expect(measured).toBeGreaterThan(cleared)
  expect(boat.commands[measured]).toMatch(/ -- \/ \|/)
  expect(boat.starts[0]).toHaveProperty('env')
  expect(boat.starts[0]).not.toHaveProperty('env.CONDUCTIVE_DISK_LINE_BYTES')
})

it('finishes a build past the workspace disk line and reports zero free storage', async () => {
  const fixture = backendFixture()
  const { boat, org, runtime } = fixture
  boat.storageOutput = '84204138496 73000000000 7721936384\n'

  const id = await build(fixture)

  expect((await readBuild(runtime.env.DB, org.id, id)).build).toMatchObject({
    state: 'succeeded',
    storageTotalBytes: 68_534_575_104,
    storageFreeBytes: 0,
  })
})

it('stores the root disk size and available bytes when the account has no disk line', async () => {
  const fixture = backendFixture()
  const { org, runtime } = fixture
  const server = new FakeE2b()
  server.envd.result.stdout = '50100000000 18500000000 31200000000\n'
  runtime.env.SANDBOX_PROVIDER_ACCOUNTS = JSON.stringify({
    e2b: {
      kind: 'e2b',
      apiKey: server.apiKey,
      domain: server.domain,
      templateId: 'e2b-template',
    },
  })
  const fetch = runtime.dependencies.fetch
  runtime.dependencies.fetch = (request) =>
    new URL(request.url).hostname.endsWith(server.domain)
      ? server.fetch(request)
      : fetch(request)
  await runtime.env.DB.prepare(
    'UPDATE orgs SET provider_account = ? WHERE id = ?',
  )
    .bind('e2b', org.id)
    .run()

  const id = await build(fixture)

  expect((await readBuild(runtime.env.DB, org.id, id)).build).toMatchObject({
    state: 'succeeded',
    storageTotalBytes: 50_100_000_000,
    storageFreeBytes: 31_200_000_000,
  })
  expect(server.envd.commands).toContainEqual(
    expect.objectContaining({ command: STORAGE_COMMAND }),
  )
  expect(server.envd.environmentContents).toHaveLength(1)
  expect(server.envd.environmentContents[0]).not.toContain(
    'CONDUCTIVE_DISK_LINE_BYTES',
  )
})

it('finishes a build without a number when the measurement fails', async () => {
  const fixture = backendFixture()
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  fixture.boat.storageOutput = 'done\n'
  const id = await build(fixture)
  const history = await readBuildHistory(fixture.runtime.env.DB, fixture.org.id)
  expect(history.currentImageBuildId).toBe(id)
  expect(history.builds[0]).toMatchObject({
    state: 'succeeded',
    storageTotalBytes: null,
    storageFreeBytes: null,
  })
  expect(warn).toHaveBeenCalledWith(
    expect.objectContaining({ kind: 'image_storage_unmeasured' }),
  )
})

it('gives no number for a build of another provider account', async () => {
  const fixture = backendFixture()
  const { org, runtime } = fixture
  const id = await build(fixture)
  await runtime.env.DB.prepare(
    'UPDATE orgs SET provider_account = ? WHERE id = ?',
  )
    .bind(SECONDARY_IMAGE_ACCOUNT, org.id)
    .run()
  const history = await readBuildHistory(runtime.env.DB, org.id)
  expect(history.builds[0]).toMatchObject({
    id,
    storageTotalBytes: null,
    storageFreeBytes: null,
  })
})

it('gives no number for a build that failed after its measurement', async () => {
  const fixture = backendFixture()
  const { org, runtime } = fixture
  const id = await build(fixture)
  // The save step stores the numbers before the snapshot, which can fail.
  await runtime.env.DB.prepare(
    "UPDATE image_builds SET state = 'failed' WHERE id = ?",
  )
    .bind(id)
    .run()
  const empty = { storageTotalBytes: null, storageFreeBytes: null }
  const history = await readBuildHistory(runtime.env.DB, org.id)
  expect(history.builds[0]).toMatchObject({ id, ...empty })
  expect((await readBuild(runtime.env.DB, org.id, id)).build).toMatchObject(
    empty,
  )
})

it.each([
  ['', null],
  ['done\n', null],
  ['0 0 0\n', null],
  ['100 120 0\n', null],
  ['100 70 40\n', null],
  ['1e3 10 20\n', null],
  [' 100  50  40\n', { totalBytes: 100, freeBytes: 40 }],
])('reads the df line %j', (stdout, storage) => {
  expect(readImageStorage(stdout)).toEqual(storage)
})
