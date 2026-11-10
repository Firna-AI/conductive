import { expect, it } from 'vitest'

import { seedReadySoftwareImage } from '../software-image/test-support'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { readBuild, readBuildJob } from './build-data'
import { advanceImageBuild, startImageBuild } from './image-builds'
import { finishImageBuild } from './image-test-support'

const fixtureForTest = setupBackendTests()

async function withoutOrgImage() {
  const fixture = fixtureForTest()
  await fixture.images.env.DB.prepare('DELETE FROM org_images WHERE org_id = ?')
    .bind(fixture.org.id)
    .run()
  return fixture
}

it.each(['first', 'later'] as const)(
  'pins a ready software image and runs the %s build without the software step',
  async (kind) => {
    const fixture =
      kind === 'first' ? await withoutOrgImage() : fixtureForTest()
    const { images, org, user, boat } = fixture
    const name = await seedReadySoftwareImage(images.env.DB)
    const id = await startImageBuild(images, {
      orgId: org.id,
      userId: user.id,
      kind: 'build',
      software: SOFTWARE,
    })
    expect(await readBuildJob(images.env.DB, org.id, id)).toMatchObject({
      softwareImageName: name,
    })
    await finishImageBuild(fixture, id)
    expect(boat.starts).toHaveLength(1)
    expect(boat.starts[0].from).toBe(name)
    expect(
      boat.commandRequests.filter((command) => command.detached),
    ).toHaveLength(1)
    const build = await readBuild(images.env.DB, org.id, id)
    expect(build.build.state).toBe('succeeded')
    const log = build.log.map((event) => event.text).join('')
    expect(log).toContain('Running the install script.')
    expect(log).not.toContain('Installing the cloud computer software.')
  },
)

it.each([
  ['first', 'missing'],
  ['first', 'other-version'],
  ['first', 'other-account'],
  ['later', 'missing'],
  ['later', 'other-version'],
  ['later', 'other-account'],
] as const)(
  'keeps the full %s-build install with a %s software image',
  async (kind, scenario) => {
    const fixture =
      kind === 'first' ? await withoutOrgImage() : fixtureForTest()
    const { images, org, user, boat } = fixture
    if (scenario !== 'missing')
      await seedReadySoftwareImage(
        images.env.DB,
        'unusable',
        scenario === 'other-version'
          ? { version: 'old' }
          : { account: 'another' },
      )
    const id = await startImageBuild(images, {
      orgId: org.id,
      userId: user.id,
      kind: 'build',
      software: SOFTWARE,
    })
    await finishImageBuild(fixture, id)
    expect(
      (await readBuildJob(images.env.DB, org.id, id)).softwareImageName,
    ).toBeNull()
    expect(boat.starts[0].from).toBeUndefined()
    expect(
      boat.commandRequests.filter((command) => command.detached),
    ).toHaveLength(2)
    const build = await readBuild(images.env.DB, org.id, id)
    expect(build.build.state).toBe('succeeded')
    expect(
      build.log
        .map((event) => event.text)
        .filter(
          (text) =>
            text === 'Installing the cloud computer software.\n' ||
            text === 'Running the install script.\n',
        ),
    ).toEqual([
      'Installing the cloud computer software.\n',
      'Running the install script.\n',
    ])
  },
)

it('keeps a later refresh on its org image', async () => {
  const fixture = fixtureForTest()
  const { images, org, user, boat } = fixture
  await seedReadySoftwareImage(images.env.DB)
  const id = await startImageBuild(images, {
    orgId: org.id,
    userId: user.id,
    kind: 'refresh',
    software: SOFTWARE,
  })
  await advanceImageBuild(images, org.id, id)
  expect(
    (await readBuildJob(images.env.DB, org.id, id)).softwareImageName,
  ).toBeNull()
  expect(boat.starts[0].from).toBe('last-good-image')
  await finishImageBuild(fixture, id)
  expect(
    boat.commandRequests.filter((command) => command.detached),
  ).toHaveLength(0)
})
