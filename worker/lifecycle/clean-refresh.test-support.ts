import { SOFTWARE, type backendFixture } from './backend-test-support'
import { seedPublishedImage } from './published-image-test-support'

export async function seedRefreshBuild(
  fixture: Awaited<ReturnType<typeof backendFixture>>,
) {
  const { images, org, repositoryId } = fixture
  const repositories = [
    {
      id: repositoryId,
      orgId: org.id,
      fullName: 'example/repository',
      defaultBranch: 'main',
    },
    {
      id: 'second-repository',
      orgId: org.id,
      fullName: 'example/second',
      defaultBranch: 'trunk',
    },
  ]
  const locations = [
    {
      repositoryId,
      directory: '/home/user/code/captured-first',
      variable: 'CONDUCTIVE_REPOSITORY_CAPTURED_FIRST_DIR',
    },
    {
      repositoryId: 'second-repository',
      directory: '/home/user/code/captured-second',
      variable: 'CONDUCTIVE_REPOSITORY_CAPTURED_SECOND_DIR',
    },
  ]
  await images.env.DB.prepare(
    `INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch)
     VALUES ('second-repository', ?, 2, 'example/second', 'trunk')`,
  )
    .bind(org.id)
    .run()
  await seedPublishedImage(images.env.DB, {
    orgId: org.id,
    buildId: 'newest-good-build',
    imageName: 'newest-good-image',
    repositories,
    locations,
    software: SOFTWARE,
    runnerProtocolVersion: 1,
    now: images.dependencies.now(),
  })
  await images.env.DB.batch([
    images.env.DB.prepare(
      "UPDATE image_build_jobs SET install_script = 'echo newest-good-install' WHERE build_id = 'newest-good-build'",
    ),
    images.env.DB.prepare(
      "UPDATE settings SET revision = 2, install_script = 'echo saved-install' WHERE org_id = ?",
    ).bind(org.id),
    images.env.DB.prepare(
      'UPDATE repositories SET selected = 0 WHERE org_id = ?',
    ).bind(org.id),
    images.env.DB.prepare(
      `INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch)
       VALUES ('waiting-repository', ?, 3, 'example/waiting', 'main')`,
    ).bind(org.id),
  ])
  return { repositories, locations }
}
