import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { promisify } from 'node:util'

import { expect, it } from 'vitest'

import { MACHINE_PATHS } from '../../../src/shared/agent-tools'
import { shellQuote } from '../../lifecycle/commands'
import { installImageSoftware } from '../../lifecycle/image-software'
import { imageNodeExecutable } from '../../lifecycle/image-runtime'
import { isolatedProcessEnvironment } from '../../test-support/process-environment'

const execute = promisify(execFile)

async function runnerLauncher() {
  const evidence = resolve('.context/runner-launcher-test')
  await mkdir(evidence, { recursive: true })
  const root = await mkdtemp(join(evidence, 'case-'))
  const installation = join(root, 'opt/conductive')
  const secrets = join(root, 'run/ascii-secrets')
  const runtime = join(root, 'run/conductive')
  const repository = join(root, "repository folder's")
  const node = imageNodeExecutable(root)
  const binaryDirectory = join(root, 'bin')
  const environment = isolatedProcessEnvironment({
    PATH: `${binaryDirectory}:/usr/bin:/bin`,
    HOME: root,
    TMPDIR: root,
    TZ: 'UTC',
    LC_ALL: 'C',
  })
  try {
    await Promise.all(
      [
        join(installation, 'staged'),
        dirname(node),
        secrets,
        runtime,
        repository,
        binaryDirectory,
        join(installation, 'software/runner'),
      ].map((directory) => mkdir(directory, { recursive: true })),
    )
    await writeFile(join(binaryDirectory, 'sudo'), '#!/bin/sh\nexit 0\n', {
      mode: 0o755,
    })
    await writeFile(join(binaryDirectory, 'node'), '#!/bin/sh\nexit 71\n', {
      mode: 0o755,
    })
    const staged = installImageSoftware({
      url: 'https://artifacts.conductive.test/runner.tar.gz',
      sha256: 'a'.repeat(64),
    })
    await execute(
      '/bin/sh',
      ['-c', staged.replaceAll('/opt/conductive', installation)],
      { cwd: root, env: environment },
    )
    const source = await readFile(
      join(installation, 'staged/runner-start.sh'),
      'utf8',
    )
    const launcher = join(root, 'runner-start.sh')
    await writeFile(
      launcher,
      source
        .replaceAll('/opt/conductive', installation)
        .replaceAll('/run/ascii-secrets', secrets)
        .replaceAll('/run/conductive', runtime),
    )
    await writeFile(
      node,
      `#!/bin/sh\nexec ${shellQuote(process.execPath)} "$@"\n`,
      { mode: 0o755 },
    )
    const configuration = new URL(
      '../../../runner/src/config.ts',
      import.meta.url,
    ).href
    await writeFile(
      join(installation, 'software/runner/main.mjs'),
      `
import { configuration } from ${JSON.stringify(configuration)}
const config = configuration(process.env)
process.stdout.write(JSON.stringify({
  workspaceId: config.workspaceId,
  workspaceToken: config.request.workspaceToken,
  runnerUrl: config.request.url,
  repository: config.cwd,
  cwd: process.cwd(),
  defaultBranch: config.defaultBranch,
  workspaceBranch: config.workspaceBranch,
}))
`,
    )
    return {
      repository,
      async run(saved: Readonly<Record<string, string>>, ready = true) {
        await writeFile(
          join(secrets, 'env.sh'),
          Object.entries(saved)
            .map(([name, value]) => `${name}=${shellQuote(value)}\n`)
            .join(''),
          { mode: 0o600 },
        )
        if (ready) await writeFile(join(runtime, 'workspace-ready'), '')
        else await rm(join(runtime, 'workspace-ready'), { force: true })
        return execute('/bin/sh', [launcher], { cwd: root, env: environment })
          .then(({ stdout, stderr }) => ({ exitCode: 0, stdout, stderr }))
          .catch((error: unknown) => {
            if (
              !(error instanceof Error) ||
              !('code' in error) ||
              !('stdout' in error) ||
              !('stderr' in error)
            )
              throw error
            return {
              exitCode: error.code,
              stdout: error.stdout,
              stderr: error.stderr,
            }
          })
      },
      dispose: () => rm(root, { recursive: true, force: true }),
    }
  } catch (error) {
    await rm(root, { recursive: true, force: true })
    throw error
  }
}

it('maps sandbox settings into the runner configuration through its staged private Node launcher', async () => {
  const launcher = await runnerLauncher()
  try {
    const result = await launcher.run({
      WORKSPACE_TOKEN: 'workspace-token',
      CONDUCTIVE_WORKSPACE_ID: 'workspace-launcher',
      CONDUCTIVE_REPOSITORY_DIR: launcher.repository,
      CONDUCTIVE_MACHINE_ORIGIN: 'https://api.conductive.test/',
      CONDUCTIVE_WORKSPACE_TOKEN: 'stale-token',
      CONDUCTIVE_REPOSITORY: '/stale-repository',
      CONDUCTIVE_RUNNER_URL: 'https://stale.conductive.test/v1/runner',
      CONDUCTIVE_DEFAULT_BRANCH: 'main',
      CONDUCTIVE_WORKSPACE_BRANCH: 'alice/tracked-task',
    })
    expect(result.exitCode, String(result.stderr)).toBe(0)
    expect(result.stderr).toBe('')
    expect(JSON.parse(String(result.stdout))).toEqual({
      workspaceId: 'workspace-launcher',
      workspaceToken: 'workspace-token',
      runnerUrl: new URL(MACHINE_PATHS.runner, 'https://api.conductive.test')
        .href,
      repository: launcher.repository,
      cwd: launcher.repository,
      defaultBranch: 'main',
      workspaceBranch: 'alice/tracked-task',
    })
  } finally {
    await launcher.dispose()
  }
})

it('starts no runner in a build, retention restart, or unfinished workspace', async () => {
  const launcher = await runnerLauncher()
  try {
    const workspace = {
      WORKSPACE_TOKEN: 'workspace-token',
      CONDUCTIVE_WORKSPACE_ID: 'workspace-launcher',
      CONDUCTIVE_REPOSITORY_DIR: launcher.repository,
      CONDUCTIVE_MACHINE_ORIGIN: 'https://api.conductive.test',
      CONDUCTIVE_DEFAULT_BRANCH: 'main',
    }
    const scenarios: readonly {
      name: string
      env: Readonly<Record<string, string>>
      ready: boolean
    }[] = [
      { name: 'build', env: {}, ready: true },
      {
        name: 'retention',
        env: { ...workspace, CONDUCTIVE_DISK_KEEPALIVE: '1' },
        ready: true,
      },
      { name: 'startup incomplete', env: workspace, ready: false },
    ]
    for (const scenario of scenarios) {
      const result = await launcher.run(scenario.env, scenario.ready)
      expect(result, scenario.name).toEqual({
        exitCode: 0,
        stdout: '',
        stderr: '',
      })
    }
  } finally {
    await launcher.dispose()
  }
})
