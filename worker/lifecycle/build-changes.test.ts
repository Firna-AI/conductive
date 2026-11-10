import { expect, it } from 'vitest'

import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { publishBuild } from './build-admission-data'
import {
  assignBuildSnapshot,
  failBuild,
  readBuildHistory,
  readBuildJob,
} from './build-data'
import { startImageBuild } from './image-builds'

const fixtureForTest = setupBackendTests()

it('reports added and removed repositories from the published image without an install script change', async () => {
  const { images, org, repositoryId } = fixtureForTest()
  const db = images.env.DB
  await db.batch([
    db
      .prepare('UPDATE repositories SET selected = 0 WHERE id = ?')
      .bind(repositoryId),
    db
      .prepare(
        `INSERT INTO repositories
      (id, org_id, github_repository_id, full_name, default_branch, selected)
      VALUES ('waiting-repository', ?, 2, 'example/waiting', 'main', 1)`,
      )
      .bind(org.id),
    db
      .prepare('UPDATE settings SET revision = revision + 1 WHERE org_id = ?')
      .bind(org.id),
  ])
  expect((await readBuildHistory(db, org.id)).changes).toEqual({
    installScript: false,
    addedRepositories: [
      { id: 'waiting-repository', fullName: 'example/waiting' },
    ],
    removedRepositories: [{ id: repositoryId, fullName: 'example/repository' }],
  })
})

it('compares the raw install script with the newest successful build, also after a refresh and a failed build', async () => {
  const fixture = fixtureForTest()
  const { images, org, user } = fixture
  const db = images.env.DB
  const save = (script: string) =>
    db
      .prepare('UPDATE settings SET install_script = ? WHERE org_id = ?')
      .bind(script, org.id)
      .run()
  const changed = async () => (await readBuildHistory(db, org.id)).changes
  const input = { orgId: org.id, userId: user.id, software: SOFTWARE }
  const publish = async (kind: 'build' | 'refresh') => {
    const id = await startImageBuild(images, { ...input, kind })
    const job = await readBuildJob(db, org.id, id)
    await assignBuildSnapshot(db, id, `image-${id}`, job.providerAccount)
    await publishBuild(
      db,
      await readBuildJob(db, org.id, id),
      images.dependencies.now(),
    )
  }
  expect(await changed()).toEqual({
    installScript: false,
    addedRepositories: [],
    removedRepositories: [],
  })
  await save(' \n')
  expect(await changed()).toMatchObject({ installScript: true })
  await publish('refresh')
  expect(await changed()).toMatchObject({ installScript: true })
  await save('exit 1')
  await fixture.setTime(images.dependencies.now() + 1)
  const failed = await startImageBuild(images, { ...input, kind: 'build' })
  await failBuild(
    db,
    failed,
    'The install script failed.',
    images.dependencies.now(),
  )
  expect(await changed()).toMatchObject({ installScript: true })
  await save('')
  expect(await changed()).toMatchObject({ installScript: false })
  await save('echo ready\n')
  await fixture.setTime(images.dependencies.now() + 1)
  await publish('build')
  expect(await changed()).toMatchObject({ installScript: false })
})

it('uses the newest build script before the first image and reports no repository changes', async () => {
  const { images, org, user } = fixtureForTest()
  const db = images.env.DB
  await db.batch([
    db
      .prepare(
        'UPDATE org_images SET image_build_id = NULL, image_name = NULL WHERE org_id = ?',
      )
      .bind(org.id),
    db.prepare('DELETE FROM image_builds WHERE org_id = ?').bind(org.id),
  ])
  expect((await readBuildHistory(db, org.id)).changes).toEqual({
    installScript: false,
    addedRepositories: [],
    removedRepositories: [],
  })
  await db
    .prepare('UPDATE settings SET install_script = ? WHERE org_id = ?')
    .bind('echo first', org.id)
    .run()
  await startImageBuild(images, {
    orgId: org.id,
    userId: user.id,
    kind: 'build',
    software: SOFTWARE,
  })
  await db.batch([
    db
      .prepare('UPDATE settings SET install_script = ? WHERE org_id = ?')
      .bind('echo second', org.id),
    db
      .prepare('UPDATE repositories SET selected = 0 WHERE org_id = ?')
      .bind(org.id),
  ])
  expect((await readBuildHistory(db, org.id)).changes).toEqual({
    installScript: true,
    addedRepositories: [],
    removedRepositories: [],
  })
  await db
    .prepare('UPDATE settings SET install_script = ? WHERE org_id = ?')
    .bind('echo first', org.id)
    .run()
  expect((await readBuildHistory(db, org.id)).changes).toEqual({
    installScript: false,
    addedRepositories: [],
    removedRepositories: [],
  })
})
