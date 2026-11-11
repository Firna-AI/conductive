import { expect, it } from 'vitest'

import { seedReadySoftwareImage } from '../software-image/test-support'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { readBuild, readBuildHistory, readBuildJob } from './build-data'
import { seedRefreshBuild } from './clean-refresh.test-support'
import { startImageBuild } from './image-builds'
import { finishImageBuild } from './image-test-support'
import { refreshImagesForPush, runImageAlarm } from './image-timers'
import { readOrgImage } from './org-image-data'
import { seedPublishedImage } from './published-image-test-support'
import { serializeSavedScript } from './saved-script'

const fixtureForTest = setupBackendTests()

it.each(['push', 'daily'] as const)(
  'starts a clean %s refresh from pinned software and installs the newest good build',
  async (cause) => {
    const fixture = fixtureForTest()
    const { images, org, boat } = fixture
    const { repositories, locations } = await seedRefreshBuild(fixture)
    const name = await seedReadySoftwareImage(images.env.DB)
    images.env.CONDUCTIVE_RUNNER_ARCHIVE_URL = SOFTWARE.url
    images.env.CONDUCTIVE_RUNNER_ARCHIVE_SHA256 = SOFTWARE.sha256
    await fixture.setTime(images.dependencies.now() + 86_400_000)
    if (cause === 'push')
      await refreshImagesForPush(images, {
        githubRepositoryId: 1,
        ref: 'refs/heads/main',
        software: SOFTWARE,
      })
    else
      await runImageAlarm(images, {
        orgId: org.id,
        software: { ...SOFTWARE, sha256: 'c'.repeat(64) },
        buildId: null,
        nextAt: images.dependencies.now(),
      })
    const id = (await readBuildHistory(images.env.DB, org.id)).builds[0].id
    await finishImageBuild(fixture, id)
    const job = await readBuildJob(images.env.DB, org.id, id)
    expect(boat.starts[0].from).toBe(name)
    expect(job).toMatchObject({
      kind: 'refresh',
      refreshCause: cause,
      settingsRevision: 1,
      softwareImageName: name,
      state: 'succeeded',
    })
    expect(serializeSavedScript(job.installScript)).toBe(
      'echo newest-good-install',
    )
    expect(fixture.sourceCalls[0]).toMatchObject({
      repositories,
      repositoryLocations: locations,
      previousRepositoryLocations: [],
    })
    expect(boat.starts[0].env).toEqual({
      CONDUCTIVE_REPOSITORY_CAPTURED_FIRST_DIR:
        '/home/user/code/captured-first',
      CONDUCTIVE_REPOSITORY_CAPTURED_SECOND_DIR:
        '/home/user/code/captured-second',
    })
    const commands = boat.commandRequests.filter((command) => command.detached)
    expect(commands).toHaveLength(1)
    expect(commands[0].command).toContain(btoa('echo newest-good-install'))
    expect(commands[0].command).not.toContain(btoa('echo saved-install'))
    expect(
      (await readBuildHistory(images.env.DB, org.id)).changes.installScript,
    ).toBe(true)
  },
)

it('takes the newest successful build settings after a legacy refresh and a failed build', async () => {
  const fixture = fixtureForTest()
  const { images, org, user } = fixture
  const { repositories, locations } = await seedRefreshBuild(fixture)
  await seedPublishedImage(images.env.DB, {
    orgId: org.id,
    buildId: 'legacy-refresh',
    imageName: 'legacy-refresh-image',
    repositories: [],
    software: SOFTWARE,
    now: images.dependencies.now() + 1,
  })
  await images.env.DB.batch([
    images.env.DB.prepare(
      "UPDATE image_builds SET kind = 'refresh', settings_revision = 9 WHERE id = 'legacy-refresh'",
    ),
    images.env.DB.prepare(
      "UPDATE image_build_jobs SET install_script = 'echo legacy-saved-install' WHERE build_id = 'legacy-refresh'",
    ),
  ])
  await fixture.setTime(images.dependencies.now() + 2)
  const failed = await startImageBuild(images, {
    orgId: org.id,
    userId: user.id,
    kind: 'build',
    software: SOFTWARE,
  })
  fixture.boat.commandExitCode = 1
  await finishImageBuild(fixture, failed)
  fixture.boat.commandExitCode = 0
  await fixture.setTime(images.dependencies.now() + 1)
  const id = await startImageBuild(images, {
    orgId: org.id,
    userId: user.id,
    kind: 'refresh',
    software: SOFTWARE,
  })
  const job = await readBuildJob(images.env.DB, org.id, id)
  expect(serializeSavedScript(job.installScript)).toBe(
    'echo newest-good-install',
  )
  expect(JSON.parse(job.repositoriesJson)).toEqual(repositories)
  expect(JSON.parse(job.repositoryLocationsJson ?? 'null')).toEqual(locations)
  expect(job.settingsRevision).toBe(1)
  await finishImageBuild(fixture, id)
  expect((await readBuild(images.env.DB, org.id, id)).build.state).toBe(
    'succeeded',
  )
})

it('keeps the last good image and returns the cause and log of a failed refresh', async () => {
  const fixture = fixtureForTest()
  const { images, org, boat } = fixture
  await seedRefreshBuild(fixture)
  await seedReadySoftwareImage(images.env.DB)
  await fixture.setTime(images.dependencies.now() + 1)
  boat.commandExitCode = 1
  boat.commandOutput = 'install failed\n'
  const [id] = await refreshImagesForPush(images, {
    githubRepositoryId: 1,
    ref: 'refs/heads/main',
    software: SOFTWARE,
  })
  await finishImageBuild(fixture, id)
  const history = await readBuildHistory(images.env.DB, org.id)
  expect(history.builds[0]).toMatchObject({
    id,
    kind: 'refresh',
    refreshCause: 'push',
    state: 'failed',
  })
  expect(history.currentImageBuildId).toBe('newest-good-build')
  expect(await readOrgImage(images.env.DB, org.id)).toMatchObject({
    imageName: 'newest-good-image',
    imageBuildId: 'newest-good-build',
  })
  const result = await readBuild(images.env.DB, org.id, id)
  expect(result.build.error).toBe(
    'The cloud computer image could not build. Check the log and try again.',
  )
  expect(result.log.map((event) => event.text).join('')).toContain(
    'Running the install script.\ninstall failed\n',
  )
  expect(boat.deletedSnapshots).not.toContain('newest-good-image')
  expect(boat.deletedIds).toEqual(['bx_1'])
})
