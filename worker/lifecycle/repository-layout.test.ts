import { expect, it } from 'vitest'

import { installScript } from '../../docs/mockups/src/fixtures/computer'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { readBuildJob } from './build-data'
import { startImageBuild } from './image-builds'
import { finishImageBuild } from './image-test-support'
import { shellQuote } from './commands'
import {
  finalizeSourceCommand,
  sourceStagingDirectory,
} from './image-sources/native-command'
import { sourceLayoutCommand } from './image-sources/layout-command'
import { repositoryLocation } from './repository-locations'
import { repositoryShellFixture } from './repository-shell-test-support'

const fixtureForTest = setupBackendTests()

it('runs the sample install script in named repositories and reinstalls dependencies on a clean refresh', async () => {
  const fixture = fixtureForTest()
  let local = await repositoryShellFixture()
  try {
    const { runtime, org, user, images, boat } = fixture
    await runtime.env.DB.batch([
      runtime.env.DB.prepare(
        "UPDATE repositories SET full_name = 'acme/storefront' WHERE id = ?",
      ).bind(fixture.repositoryId),
      runtime.env.DB.prepare(
        "INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch) VALUES ('billing', ?, 2, 'acme/billing-service', 'main')",
      ).bind(org.id),
      runtime.env.DB.prepare(
        "INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch) VALUES ('marketing', ?, 3, 'acme/marketing-site', 'main')",
      ).bind(org.id),
      runtime.env.DB.prepare(
        'UPDATE settings SET install_script = ? WHERE org_id = ?',
      ).bind(
        [
          installScript,
          'test "$CONDUCTIVE_REPOSITORY_STOREFRONT_DIR" = "$HOME/code/storefront"',
          'test "$CONDUCTIVE_REPOSITORY_BILLING_SERVICE_DIR" = "$HOME/code/billing-service"',
          'test "$CONDUCTIVE_REPOSITORY_MARKETING_SITE_DIR" = "$HOME/code/marketing-site"',
        ].join('\n'),
        org.id,
      ),
    ])
    const prepared: string[][] = []
    images.prepareSources = async (input) => {
      const locations = input.repositoryLocations ?? []
      expect(
        await local.run(
          sourceLayoutCommand(
            input.buildId,
            locations,
            input.previousRepositoryLocations ?? [],
          ),
        ),
      ).toMatchObject({ exitCode: 0 })
      for (const [index, repository] of input.repositories.entries()) {
        const directory = repositoryLocation(locations, repository.id)
        const staging = sourceStagingDirectory(input.buildId, index)
        expect(
          await local.run(
            `git -c core.hooksPath=/dev/null init --bare --quiet --template= --initial-branch=main ${shellQuote(staging)}`,
          ),
        ).toMatchObject({ exitCode: 0 })
        expect(
          await local.run(
            finalizeSourceCommand({
              buildId: input.buildId,
              index,
              repository,
              directory,
            }),
          ),
        ).toMatchObject({ exitCode: 0 })
      }
      prepared.push(locations.map((location) => location.directory))
    }
    const installs: (number | null)[] = []
    const installErrors: string[] = []
    boat.beforeCommand = async (command) => {
      if (!command.includes('/tmp/conductive-install.sh')) return
      const start = boat.starts.at(-1)
      const environment = start?.env
      if (typeof environment !== 'object' || environment === null)
        throw new Error('Missing image environment')
      const values: Record<string, string> = {}
      for (const [key, value] of Object.entries(environment)) {
        if (typeof value !== 'string')
          throw new Error('Invalid image environment')
        values[key] = value
      }
      await local.writeEnvironment(values)
      const result = await local.run(command)
      installs.push(result.exitCode)
      installErrors.push(result.stderr)
    }
    const build = await startImageBuild(images, {
      orgId: org.id,
      userId: user.id,
      kind: 'build',
      software: SOFTWARE,
    })
    await finishImageBuild(fixture, build)
    expect(installs, installErrors.join('\n')).toEqual([0])
    expect(await local.calls()).toBe(
      [
        'sudo|/home/user|apt-get install -y postgresql-client-16 redis-server',
        'npm|/home/user/code/storefront|ci',
        'npx|/home/user/code/storefront|prisma generate',
        'pnpm|/home/user/code/billing-service|install',
        'bun|/home/user/code/marketing-site|install',
        '',
      ].join('\n'),
    )
    const job = await readBuildJob(runtime.env.DB, org.id, build)
    expect(boat.starts[0]).toMatchObject({
      env: {
        CONDUCTIVE_REPOSITORY_STOREFRONT_DIR: '/home/user/code/storefront',
        CONDUCTIVE_REPOSITORY_BILLING_SERVICE_DIR:
          '/home/user/code/billing-service',
        CONDUCTIVE_REPOSITORY_MARKETING_SITE_DIR:
          '/home/user/code/marketing-site',
      },
    })
    expect(Object.keys(boat.starts[0].env ?? {}).sort()).toEqual([
      'CONDUCTIVE_REPOSITORY_BILLING_SERVICE_DIR',
      'CONDUCTIVE_REPOSITORY_MARKETING_SITE_DIR',
      'CONDUCTIVE_REPOSITORY_STOREFRONT_DIR',
    ])
    await local.dispose()
    local = await repositoryShellFixture()
    await runtime.env.DB.prepare('UPDATE repositories SET selected = 0').run()
    const refresh = await startImageBuild(images, {
      orgId: org.id,
      userId: user.id,
      kind: 'refresh',
      software: SOFTWARE,
    })
    await finishImageBuild(fixture, refresh)
    const refreshed = await readBuildJob(runtime.env.DB, org.id, refresh)
    expect(refreshed.repositoryLocationsJson).toBe(job.repositoryLocationsJson)
    expect(refreshed.previousRepositoryLocationsJson).toBe('[]')
    expect(prepared).toEqual([
      [
        '/home/user/code/billing-service',
        '/home/user/code/marketing-site',
        '/home/user/code/storefront',
      ],
      [
        '/home/user/code/billing-service',
        '/home/user/code/marketing-site',
        '/home/user/code/storefront',
      ],
    ])
    expect(installs).toEqual([0, 0])
    expect(
      await local.read('/home/user/code/storefront/node_modules/installed'),
    ).toBe('installed')
  } finally {
    await local.dispose()
  }
})
