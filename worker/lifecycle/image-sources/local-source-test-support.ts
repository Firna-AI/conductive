import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import type { TestHarness } from '../../test-support/harness'
import { TEST_TIME } from '../../test-support/harness'
import { FakeGitHubGit } from '../fake-github-git-test-support'
import {
  repositoryLocation,
  repositoryLocations,
} from '../repository-locations'
import type { SelectedRepository } from '../settings-data'
import {
  NativeGitHubAccess,
  INSTALLATION_TOKEN,
  SOURCE_BRANCH,
} from './native-github-test-support'
import {
  NativeSourceProvider,
  nativeEnvironment,
  nativeGit,
} from './native-process-test-support'
import { createGitHubImageSourceMaterializer } from './materialize'
import { SourceCommandPort } from './source-commands'
import { SOFTWARE } from '../backend-test-support'

/** Real Git, a local bare GitHub repository, and the real private claim handler. */
export async function localSourceFixture(
  harness: TestHarness,
  privateKey: string,
  empty = false,
) {
  await harness.env.DB.prepare('DELETE FROM image_source_jobs').run()
  const session = await harness.login()
  const org = await harness.createOrg(session)
  const repository: SelectedRepository = {
    id: "source one'with spaces",
    orgId: org.id,
    fullName: 'example/source-repository',
    defaultBranch: SOURCE_BRANCH,
  }
  const env = {
    ...harness.env,
    MACHINE_ORIGIN: 'https://machine.conductive.test',
    GITHUB_APP_PRIVATE_KEY: privateKey,
  }
  const evidence = resolve(
    import.meta.dirname,
    '../../../.context/boat-native-remote-workspaces/milestone-5/decision-90/native-sources/native-git',
  )
  await mkdir(evidence, { recursive: true })
  const root = await mkdtemp(join(evidence, 'case-'))
  const home = join(root, 'home')
  const seed = join(root, 'seed')
  const remote = join(root, 'repository.git')
  const environment = nativeEnvironment(home, root)
  let github: FakeGitHubGit | undefined
  try {
    await mkdir(home)
    await mkdir(seed)
    const seedGit = (...args: string[]) => nativeGit(args, seed, environment)
    const remoteGit = (...args: string[]) =>
      nativeGit(args, remote, environment)
    await seedGit('init', '--quiet', `--initial-branch=${SOURCE_BRANCH}`)
    await seedGit(
      'init',
      '--quiet',
      '--bare',
      `--initial-branch=${SOURCE_BRANCH}`,
      remote,
    )
    let firstOid = ''
    let secondOid = ''
    const content = Buffer.alloc(140_000)
    let seedValue = 971
    for (let index = 0; index < content.length; index++) {
      seedValue ^= seedValue << 13
      seedValue ^= seedValue >>> 17
      seedValue ^= seedValue << 5
      content[index] = 32 + ((seedValue >>> 0) % 95)
    }
    if (!empty) {
      await writeFile(join(seed, 'source.txt'), 'Before the source refresh.\n')
      await writeFile(join(seed, '.gitignore'), 'node_modules/\n')
      await seedGit('add', 'source.txt', '.gitignore')
      await seedGit('commit', '--quiet', '-m', 'First source commit')
      firstOid = (await seedGit('rev-parse', 'HEAD')).toString().trim()
      await seedGit('tag', '-a', 'v1.0.0', '-m', 'Release version one.')
      await seedGit('push', '--quiet', remote, SOURCE_BRANCH, '--tags')
      await writeFile(
        Buffer.concat([
          Buffer.from(`${remote}/refs/tags/raw-`),
          Buffer.from([0xff]),
        ]),
        `${firstOid}\n`,
      )
      await writeFile(join(seed, 'source.txt'), content)
      await seedGit('commit', '--quiet', '-am', 'Second source commit')
      secondOid = (await seedGit('rev-parse', 'HEAD')).toString().trim()
      await seedGit('tag', 'lightweight-current')
    }
    await env.DB.prepare(
      `INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch, installation_id, selected)
       VALUES (?, ?, 101, ?, ?, 701, 1)`,
    )
      .bind(
        repository.id,
        org.id,
        repository.fullName,
        repository.defaultBranch,
      )
      .run()
    const locations = repositoryLocations([repository])
    const input = {
      orgId: org.id,
      buildId: 'build-one',
      sandboxId: 'builder-one',
      providerAccount: 'boat',
      repositories: [repository],
      repositoryLocations: locations,
      previousRepositoryLocations: locations,
    }
    const newBuild = async (
      id: string,
      kind: 'build' | 'refresh' = 'refresh',
    ) => {
      await env.DB.prepare("UPDATE image_builds SET state = 'succeeded'").run()
      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO image_builds (id, org_id, kind, state, sandbox_id, settings_revision, runner_protocol_version, started_at)
           VALUES (?, ?, ?, 'running', 'builder-one', 1, 1, ?)`,
        ).bind(id, org.id, kind, TEST_TIME),
        env.DB.prepare(
          `INSERT INTO image_build_jobs (build_id, phase, install_script, repositories_json, software_json, repository_locations_json)
           VALUES (?, 'sources', '', ?, ?, ?)`,
        ).bind(
          id,
          JSON.stringify([repository]),
          JSON.stringify(SOFTWARE),
          JSON.stringify(locations),
        ),
      ])
      input.buildId = id
    }
    await newBuild('build-one', 'build')
    const access = new NativeGitHubAccess(env)
    github = new FakeGitHubGit({
      repository: remote,
      gitExecPath: (await seedGit('--exec-path')).toString().trim(),
      environment,
      issueCredential: async () => new Response(null, { status: 404 }),
      expectedToken: INSTALLATION_TOKEN,
      authorize: access.authorize,
      privateRequest: access.privateRequest,
    })
    const origin = await github.listen()
    const provider = new NativeSourceProvider(
      home,
      root,
      origin,
      harness.boat.fetch,
    )
    const fullInput = {
      ...input,
      commands: new SourceCommandPort(provider, input.sandboxId),
    }
    const prepare = () =>
      createGitHubImageSourceMaterializer(env, { fetch: access.fetch })(
        fullInput,
      )
    const step = async () => {
      await provider.settle()
      return prepare()
    }
    const finish = async () => {
      for (let count = 0; count < 30; count++) {
        if (await step()) return
      }
      throw new Error('Native sources did not finish')
    }
    const directory = repositoryLocation(locations, repository.id).replace(
      '/home/user',
      home,
    )
    provider.beforeStart = async (command) => {
      if (command.includes('show-ref --verify')) {
        access.events.push('finalize')
        if (access.activeTokens.length)
          throw new Error('Checkout reached a live token')
      }
    }
    return {
      env,
      org,
      repository,
      input: fullInput,
      root,
      home,
      directory,
      access,
      provider,
      github,
      firstOid,
      secondOid,
      content,
      prepare,
      step,
      finish,
      git: (...args: string[]) => nativeGit(args, directory, environment),
      remoteGit,
      refresh: async () => {
        await seedGit('push', '--quiet', remote, SOURCE_BRANCH, '--tags')
        await newBuild('build-two')
        fullInput.buildId = input.buildId
        await env.DB.prepare('UPDATE repositories SET selected = 0').run()
      },
      config: () => readFile(join(directory, '.git/config'), 'utf8'),
      write: (path: string, text: string) =>
        writeFile(join(directory, path), text),
      dispose: async () => {
        await provider.settle()
        await github?.close()
        await rm(root, { recursive: true, force: true })
      },
    }
  } catch (error) {
    await github?.close()
    await rm(root, { recursive: true, force: true })
    throw error
  }
}
