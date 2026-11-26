import { expect, it } from 'vitest'

import { seedReadySoftwareImage } from '../software-image/test-support'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { lifecycleCommandBody } from './command-test-support'
import { imagePackagesVersion } from './image-packages'
import { startImageBuild } from './image-builds'
import { finishImageBuild } from './image-test-support'

const fixtureForTest = setupBackendTests()
type Fixture = ReturnType<typeof fixtureForTest>

/** Runs one build to its end and returns its software command and the version that it records. */
async function runBuild(
  fixture: Fixture,
  kind: 'build' | 'refresh',
  earlierStart?: string,
) {
  const { images, org, user, boat } = fixture
  boat.commands.length = 0
  const id = await startImageBuild(images, {
    orgId: org.id,
    userId: user.id,
    kind,
    software: SOFTWARE,
  })
  if (earlierStart !== undefined)
    await images.env.DB.prepare(
      'UPDATE image_build_jobs SET packages_version = ? WHERE build_id = ?',
    )
      .bind(earlierStart, id)
      .run()
  await finishImageBuild(fixture, id)
  const software = boat.commands
    .map(lifecycleCommandBody)
    .find((command) => command.includes('update apply'))
  if (!software) throw new Error('Missing software command')
  const recorded = await images.env.DB.prepare(
    'SELECT packages_version FROM image_build_jobs WHERE build_id = ?',
  )
    .bind(id)
    .first<string | null>('packages_version')
  return { software, recorded }
}

function setOrgImagePackages(fixture: Fixture, version: string | null) {
  return fixture.images.env.DB.prepare(
    "UPDATE image_build_jobs SET packages_version = ? WHERE build_id = 'published-image'",
  )
    .bind(version)
    .run()
}

it.each(['build', 'refresh'] as const)(
  'skips a current apt part in a %s from the org image',
  async (kind) => {
    const fixture = fixtureForTest()
    const current = await imagePackagesVersion()
    await setOrgImagePackages(fixture, current)
    const { software, recorded } = await runBuild(fixture, kind)
    expect(software).toContain('dpkg-query -W')
    expect(software).toContain('update check --bootstrap')
    expect(recorded).toBe(current)
  },
)

it.each([null, 'older'])(
  'runs apt from an org image with the apt part %s, then skips it in the next refresh',
  async (version) => {
    const fixture = fixtureForTest()
    await setOrgImagePackages(fixture, version)
    const current = await imagePackagesVersion()
    const first = await runBuild(fixture, 'build')
    expect(first.software).toContain(
      'apt-get -o Acquire::AllowReleaseInfoChange::Label=true update',
    )
    expect(first.software).not.toContain('dpkg-query')
    expect(first.recorded).toBe(current)
    const next = await runBuild(fixture, 'refresh')
    expect(next.software).toContain('dpkg-query -W')
    expect(next.recorded).toBe(current)
  },
)

it.each([
  ['current', true],
  ['unknown', false],
] as const)(
  'reads the apt part of a pinned software image with a %s version',
  async (_name, current) => {
    const fixture = fixtureForTest()
    const db = fixture.images.env.DB
    await db
      .prepare('DELETE FROM org_images WHERE org_id = ?')
      .bind(fixture.org.id)
      .run()
    const name = await seedReadySoftwareImage(db)
    await db
      .prepare(
        'UPDATE software_images SET packages_version = ? WHERE snapshot_name = ?',
      )
      .bind(current ? await imagePackagesVersion() : null, name)
      .run()
    const { software } = await runBuild(fixture, 'build')
    expect(fixture.boat.starts[0].from).toBe(name)
    expect(software.includes('dpkg-query -W')).toBe(current)
  },
)

it('keeps no version when an earlier start of the step carried another apt part', async () => {
  const fixture = fixtureForTest()
  await setOrgImagePackages(fixture, await imagePackagesVersion())
  // A start from an older deploy may already run in the sandbox, and the
  // command journal then keeps that command.
  const first = await runBuild(fixture, 'build', 'older')
  expect(first.recorded).toBe('')
  const next = await runBuild(fixture, 'refresh')
  expect(next.software).toContain(
    'apt-get -o Acquire::AllowReleaseInfoChange::Label=true update',
  )
  expect(next.software).not.toContain('dpkg-query')
})

it('keeps the current version when an earlier start of the step carried the same apt part', async () => {
  const fixture = fixtureForTest()
  const current = await imagePackagesVersion()
  await setOrgImagePackages(fixture, current)
  const first = await runBuild(fixture, 'build', current)
  expect(first.recorded).toBe(current)
  const next = await runBuild(fixture, 'refresh')
  expect(next.software).toContain('dpkg-query -W')
})
