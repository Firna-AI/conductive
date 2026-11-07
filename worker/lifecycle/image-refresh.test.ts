import { expect, it } from 'vitest'
import { TEST_TIME } from '../test-support/harness'
import { SOFTWARE } from './backend-test-support'
import { setupBackendTests } from './backend-test-hooks'
import { readBuildJob, readBuildHistory } from './build-data'
import { startImageBuild, advanceImageBuild } from './image-builds'
import { refreshImagesForPush, runImageAlarm } from './image-timers'
import { finishImageBuild as finish } from './image-test-support'

const backendFixture = setupBackendTests()

it('refreshes the captured repositories and revision with push throttling and a durable daily deadline', async () => {
  const fixture = await backendFixture()
  try {
    const { images, org, user, runtime, boat } = fixture
    const good = await startImageBuild(images, {
      orgId: org.id,
      userId: user.id,
      kind: 'build',
      software: SOFTWARE,
    })
    await finish(fixture, good)
    await runtime.env.DB.batch([
      runtime.env.DB.prepare(
        'UPDATE repositories SET selected = 0 WHERE id = ?',
      ).bind(fixture.repositoryId),
      runtime.env.DB.prepare(
        'INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch) VALUES (?, ?, 2, ?, ?)',
      ).bind('repository-two', org.id, 'example/second', 'trunk'),
      runtime.env.DB.prepare(
        'UPDATE settings SET revision = 2, install_script = ? WHERE org_id = ?',
      ).bind('echo changed-install', org.id),
    ])
    fixture.setTime(TEST_TIME + 1_000)
    expect(
      await refreshImagesForPush(images, {
        githubRepositoryId: 2,
        ref: 'refs/heads/trunk',
        software: SOFTWARE,
      }),
    ).toEqual([])
    expect(
      await refreshImagesForPush(images, {
        githubRepositoryId: 1,
        ref: 'refs/heads/feature',
        software: SOFTWARE,
      }),
    ).toEqual([])
    const [refresh] = await refreshImagesForPush(images, {
      githubRepositoryId: 1,
      ref: 'refs/heads/main',
      software: SOFTWARE,
    })
    boat.commands.length = 0
    await finish(fixture, refresh)
    const job = await readBuildJob(runtime.env.DB, org.id, refresh)
    expect(job).toMatchObject({ kind: 'refresh', settingsRevision: 1 })
    expect(JSON.parse(job.repositoriesJson)).toEqual([
      {
        id: fixture.repositoryId,
        orgId: org.id,
        fullName: 'example/repository',
        defaultBranch: 'main',
      },
    ])
    expect(boat.commands).toHaveLength(0)
    expect(
      fixture.sourceCalls
        .at(-1)
        ?.repositories.map((repository) => repository.id),
    ).toEqual([fixture.repositoryId])
    expect(
      await refreshImagesForPush(images, {
        githubRepositoryId: 1,
        ref: 'refs/heads/main',
        software: SOFTWARE,
      }),
    ).toEqual([])
    fixture.setTime(TEST_TIME + 1_801_000)
    const busy = await startImageBuild(images, {
      orgId: org.id,
      userId: user.id,
      kind: 'build',
      software: SOFTWARE,
    })
    await advanceImageBuild(images, org.id, busy)
    await advanceImageBuild(images, org.id, busy)
    expect(
      await refreshImagesForPush(images, {
        githubRepositoryId: 1,
        ref: 'refs/heads/main',
        software: SOFTWARE,
      }),
    ).toEqual([])
    await finish(fixture, busy)
    const pending = fixture.scheduled.at(-1)
    expect(pending).toMatchObject({
      buildId: null,
      nextAt: TEST_TIME + 1_801_000,
    })
    if (!pending) throw new Error('Missing pending push timer')
    await runImageAlarm(images, pending)
    const pendingId = fixture.scheduled.at(-1)?.buildId
    if (!pendingId) throw new Error('Missing pending push refresh')
    await finish(fixture, pendingId)
    const next = fixture.scheduled.at(-1)
    expect(next).toMatchObject({
      buildId: null,
      nextAt: TEST_TIME + 88_201_000,
    })
    fixture.setTime(TEST_TIME + 88_201_000)
    if (!next) throw new Error('Missing scheduled daily timer')
    await runImageAlarm(images, next)
    expect(
      (await readBuildHistory(runtime.env.DB, org.id)).builds[0],
    ).toMatchObject({ kind: 'refresh', state: 'running' })
    expect(fixture.scheduled.at(-1)?.buildId).not.toBe(null)
  } finally {
    await fixture.dispose()
  }
})
