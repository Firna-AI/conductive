import { afterEach, expect, it, vi } from 'vitest'

import { SOFTWARE } from './backend-test-support'
import { setupBackendTests } from './backend-test-hooks'
import { readBuild, readBuildHistory } from './build-data'
import { startImageBuild } from './image-builds'
import { STORAGE_COMMAND, readImageStorage } from './image-storage'
import { SECONDARY_IMAGE_ACCOUNT } from './org-image-account-test-support'
import { finishImageBuild as finish } from './image-test-support'

const backendFixture = setupBackendTests()

const TOTAL = 50_100_000_000
const FREE = 31_200_000_000

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

it('stores the free storage of a good build before its image saves', async () => {
  const fixture = backendFixture()
  const { boat, org, runtime } = fixture
  const id = await build(fixture)
  const storage = { storageTotalBytes: TOTAL, storageFreeBytes: FREE }
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

it.each([
  ['', null],
  ['done\n', null],
  ['0 0\n', null],
  ['100 200\n', null],
  ['1e3 10\n', null],
  [' 100  40\n', { totalBytes: 100, freeBytes: 40 }],
])('reads the df line %j', (stdout, storage) => {
  expect(readImageStorage(stdout)).toEqual(storage)
})
