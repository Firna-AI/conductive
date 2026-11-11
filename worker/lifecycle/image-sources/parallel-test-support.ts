import { generateKeyPairSync } from 'node:crypto'

import type { HttpFetch } from '../../env'
import { ProviderError } from '../../sandbox/errors'
import type { CommandOffsets, CommandStatus } from '../../sandbox/provider'
import { TEST_TIME, type TestHarness } from '../../test-support/harness'
import { SOFTWARE } from '../backend-test-support'
import { readBuildJob } from '../build-data'
import { advanceImageBuild, type ImageRuntime } from '../image-builds'
import { LifecycleBoat } from '../lifecycle-boat-test-support'
import { repositoryLocations } from '../repository-locations'
import {
  handleImageSourceCredential,
  IMAGE_SOURCE_CREDENTIAL_PATH,
} from './credential'
import { createGitHubImageSourceMaterializer } from './materialize'
import { NativeGitHubAccess } from './native-github-test-support'
import { SourceCommandPort } from './source-commands'

const privateKey = generateKeyPairSync('rsa', { modulusLength: 2048 })
  .privateKey.export({ type: 'pkcs1', format: 'pem' })
  .toString()

interface CopyProcess {
  kind: 'layout' | 'copy' | 'finalize'
  command: string
  exitCode: number | null
}

export async function parallelFixture(
  harness: TestHarness,
  options: {
    memoryMiB?: number
    sizesKiB?: (number | null)[]
    kind?: 'build' | 'refresh'
    installations?: number[]
  } = {},
) {
  await harness.env.DB.prepare('DELETE FROM image_source_jobs').run()
  await harness.env.DB.prepare('DELETE FROM image_source_runs').run()
  const org = await harness.createOrg(await harness.login())
  const repositories = (options.sizesKiB ?? [1, 1]).map((_, index) => ({
    id: `parallel-${index}`,
    orgId: org.id,
    fullName: `example/parallel-${index}`,
    defaultBranch: 'main',
  }))
  const env = {
    ...harness.env,
    GITHUB_APP_PRIVATE_KEY: privateKey,
    MACHINE_ORIGIN: 'https://machine.conductive.test',
  }
  const locations = repositoryLocations(repositories)
  const seeded = repositories.map((repository, index) => ({
    ...repository,
    githubId: 101 + index,
    installationId: options.installations?.[index] ?? 701,
  }))
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO repositories (id, org_id, full_name, default_branch, github_repository_id, installation_id, selected)
       SELECT json_extract(value, '$.id'), json_extract(value, '$.orgId'),
         json_extract(value, '$.fullName'), 'main', json_extract(value, '$.githubId'),
         json_extract(value, '$.installationId'), 1 FROM json_each(?)`,
    ).bind(JSON.stringify(seeded)),
    env.DB.prepare(
      `INSERT INTO image_builds (id, org_id, kind, state, sandbox_id, settings_revision, runner_protocol_version, started_at)
       VALUES ('parallel-build', ?, ?, 'running', 'builder-one', 1, 1, ?)`,
    ).bind(org.id, options.kind ?? 'build', TEST_TIME),
    env.DB.prepare(
      `INSERT INTO image_build_jobs (build_id, phase, install_script, repositories_json, software_json, repository_locations_json)
       VALUES ('parallel-build', 'sources', '', ?, ?, ?)`,
    ).bind(
      JSON.stringify(repositories),
      JSON.stringify(SOFTWARE),
      JSON.stringify(locations),
    ),
  ])
  const access = new NativeGitHubAccess(env)
  for (const repository of seeded)
    access.installations.set(repository.githubId, repository.installationId)
  for (const [index, size] of (options.sizesKiB ?? [1, 1]).entries())
    access.sizes.set(index + 101, size)
  const processes: CopyProcess[] = []
  const revoked: string[] = []
  const revokeRefusals = new Set<string>()
  const statusFailures = new Map<number, ProviderError>()
  let refuseCopyStarts = 0
  let now = TEST_TIME
  const fetch: HttpFetch = async (request) => {
    if (
      request.method === 'DELETE' &&
      new URL(request.url).pathname === '/installation/token'
    ) {
      const token = request.headers.get('Authorization')?.slice(7) ?? ''
      revoked.push(token)
      if (revokeRefusals.has(token)) return new Response(null, { status: 503 })
    }
    return access.fetch(request)
  }
  const commands = new SourceCommandPort(
    {
      startCommand: async (_sandboxId, command) => {
        const kind = command.includes('clone --bare')
          ? 'copy'
          : command.includes('show-ref --verify')
            ? 'finalize'
            : 'layout'
        if (kind === 'copy' && refuseCopyStarts-- > 0)
          throw new ProviderError('rate_limited', 429, null, 7)
        if (kind === 'copy') {
          const grant = command.match(
            /Authorization: Bearer ([A-Za-z0-9_-]+)/u,
          )?.[1]
          const response = await handleImageSourceCredential(
            new Request(
              `${env.MACHINE_ORIGIN}${IMAGE_SOURCE_CREDENTIAL_PATH}`,
              { method: 'POST', headers: { Authorization: `Bearer ${grant}` } },
            ),
            env,
          )
          await response.text()
        }
        processes.push({
          kind,
          command,
          exitCode: kind === 'layout' ? 0 : null,
        })
        access.events.push(`start-${kind}`)
        return { processId: processes.length }
      },
      getCommandStatus: async (
        _sandboxId,
        processId,
        offsets: CommandOffsets,
      ): Promise<CommandStatus> => {
        const failure = statusFailures.get(processId)
        if (failure) throw failure
        const process = processes[processId - 1]
        return {
          ...offsets,
          processId,
          running: process.exitCode === null,
          state: process.exitCode === null ? 'running' : 'exited',
          exitCode: process.exitCode,
          timedOut: null,
          stdout:
            process.kind === 'layout'
              ? `MemAvailable: ${(options.memoryMiB ?? 2048) * 1024} kB\n`
              : '',
          stderr: '',
          stdoutNextOffset: 0,
          stderrNextOffset: 0,
          more: false,
        }
      },
    },
    'builder-one',
  )
  const input = {
    orgId: org.id,
    buildId: 'parallel-build',
    sandboxId: 'builder-one',
    providerAccount: 'boat',
    repositories,
    repositoryLocations: locations,
    commands,
  }
  const dependencies = { fetch, now: () => now }
  const prepare = () =>
    createGitHubImageSourceMaterializer(env, dependencies)(input)
  const boat = new LifecycleBoat()
  const runtime: ImageRuntime = {
    env,
    dependencies: {
      ...dependencies,
      randomToken: () => 'unused',
      fetch: (request) =>
        new URL(request.url).hostname === 'boat.dev'
          ? boat.fetch(request)
          : fetch(request),
    },
    prepareSources: () => prepare(),
    scheduler: { schedule: async () => {} },
  }
  return {
    env,
    input,
    access,
    processes,
    revoked,
    revokeRefusals,
    statusFailures,
    prepare,
    copies: () => processes.filter((process) => process.kind === 'copy'),
    finalizes: () => processes.filter((process) => process.kind === 'finalize'),
    copyTokens: () =>
      [...access.tokens.keys()].filter(
        (token) => access.tokenScopes.get(token)?.canRead,
      ),
    tick: async (count = 1) => {
      for (let i = 0; i < count; i++) await prepare()
    },
    advance: () => advanceImageBuild(runtime, org.id, input.buildId),
    job: () => readBuildJob(env.DB, org.id, input.buildId),
    setTime: (value: number) => {
      now = value
    },
    refuseStarts: (count: number) => {
      refuseCopyStarts = count
    },
  }
}
