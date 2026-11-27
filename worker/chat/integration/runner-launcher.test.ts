import { execFile } from 'node:child_process'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { expect, it } from 'vitest'

import { MACHINE_PATHS } from '../../../src/shared/agent-tools'
import readRepositoryFolders from '../../../image/repository-folders.sh?raw'
import { shellQuote } from '../../lifecycle/commands'
import runnerStart from '../../../image/runner-start.sh?raw'
import { REPOSITORY_FOLDERS_FILE } from '../../../src/shared/restore-marker'
import { workspaceStartupCommand } from '../../lifecycle/image-software'
import { repositoryChangeSettleCommand } from '../../lifecycle/repository-change-commands'
import { readSavedScript } from '../../lifecycle/saved-script'
import { isolatedProcessEnvironment } from '../../test-support/process-environment'
import { testDirectory } from '../../test-support/test-directory'

const execute = promisify(execFile)

async function runnerLauncher() {
  const files = await testDirectory('runner-launcher-')
  const root = files.path
  const installation = join(root, 'opt/conductive')
  const secrets = join(root, 'run/ascii-secrets')
  const runtime = join(root, 'run/conductive')
  const repository = join(root, "repository folder's")
  const clone = join(root, 'clone')
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
        secrets,
        runtime,
        repository,
        clone,
        binaryDirectory,
        join(installation, 'current/system'),
      ].map((directory) => mkdir(directory, { recursive: true })),
    )
    await writeFile(join(binaryDirectory, 'sudo'), '#!/bin/sh\nexit 0\n', {
      mode: 0o755,
    })
    await writeFile(join(binaryDirectory, 'node'), '#!/bin/sh\nexit 71\n', {
      mode: 0o755,
    })
    await writeFile(
      join(installation, 'current/system/repository-folders.sh'),
      readRepositoryFolders,
    )
    const source = runnerStart.replaceAll('@RUNNER_PATH@', MACHINE_PATHS.runner)
    const launcher = join(root, 'runner-start.sh')
    await writeFile(
      launcher,
      source
        .replaceAll('/opt/conductive', installation)
        .replaceAll('/run/ascii-secrets', secrets)
        .replaceAll('/run/conductive', runtime),
    )
    await writeFile(
      join(installation, 'current/conductive'),
      `#!${process.execPath}
process.stdout.write(JSON.stringify({
  command: process.argv.slice(2),
  workspaceId: process.env.CONDUCTIVE_WORKSPACE_ID,
  workspaceToken: process.env.CONDUCTIVE_WORKSPACE_TOKEN,
  runnerUrl: process.env.CONDUCTIVE_RUNNER_URL,
  repository: process.env.CONDUCTIVE_REPOSITORY,
  cwd: process.cwd(),
  defaultBranch: process.env.CONDUCTIVE_DEFAULT_BRANCH,
  workspaceBranch: process.env.CONDUCTIVE_WORKSPACE_BRANCH,
  originalFolder: process.env.CONDUCTIVE_REPOSITORY_ORIGINAL_DIR,
  clonedFolder: process.env.CONDUCTIVE_REPOSITORY_CLONED_DIR,
}))
`,
      { mode: 0o755 },
    )
    return {
      repository,
      clone,
      readFolders: () =>
        readFile(
          REPOSITORY_FOLDERS_FILE.replace('/run/conductive', runtime),
          'utf8',
        ),
      command: (command: string) =>
        execute(
          '/bin/sh',
          [
            '-c',
            command
              .replaceAll(
                'sudo -n install -d -m 700 -o user -g user /run/conductive',
                'install -d -m 700 /run/conductive',
              )
              .replaceAll(
                'sudo -n flock /run/conductive/bootstrap-activate.lock systemctl restart conductive-runner.service',
                ':',
              )
              .replaceAll('/run/ascii-secrets', secrets)
              .replaceAll('/run/conductive-terminal', join(root, 'terminal'))
              .replaceAll('/run/conductive', runtime),
          ],
          { cwd: root, env: environment },
        ),
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
      dispose: files.remove,
    }
  } catch (error) {
    await files.remove()
    throw error
  }
}

it('maps sandbox settings into the Rust runner through its release launcher', async () => {
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
      command: ['runner'],
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

it('restores cloned folder variables in the runner after a move back and software restart', async () => {
  const launcher = await runnerLauncher()
  try {
    const start = {
      WORKSPACE_TOKEN: 'workspace-token',
      CONDUCTIVE_WORKSPACE_ID: 'workspace-launcher',
      CONDUCTIVE_REPOSITORY_DIR: launcher.repository,
      CONDUCTIVE_MACHINE_ORIGIN: 'https://api.conductive.test',
      CONDUCTIVE_DEFAULT_BRANCH: 'main',
      CONDUCTIVE_REPOSITORY_ORIGINAL_DIR: '/home/user/code/from-start',
    }
    const original = {
      repositoryId: 'original',
      directory: '/home/user/code/original',
      variable: 'CONDUCTIVE_REPOSITORY_ORIGINAL_DIR',
    }
    const cloned = {
      repositoryId: 'cloned',
      directory: '/home/user/code/cloned',
      variable: 'CONDUCTIVE_REPOSITORY_CLONED_DIR',
    }

    const first = await launcher.run(start)
    expect(first.exitCode).toBe(0)
    expect(JSON.parse(String(first.stdout))).not.toHaveProperty('clonedFolder')
    await launcher.command(
      workspaceStartupCommand(
        readSavedScript(''),
        null,
        'workspace',
        undefined,
        [original],
      ),
    )
    expect(await launcher.readFolders()).toBe(
      'CONDUCTIVE_REPOSITORY_ORIGINAL_DIR=/home/user/code/original\n',
    )
    const locations = [original, cloned]
    await launcher.command(
      repositoryChangeSettleCommand(
        {
          directory: launcher.repository,
          target: {
            directory: launcher.clone,
            clone: { variable: cloned.variable },
          },
        },
        locations,
      ),
    )
    await launcher.command(
      repositoryChangeSettleCommand(
        {
          directory: launcher.clone,
          target: { directory: launcher.repository },
        },
        locations,
      ),
    )
    const restarted = await launcher.run(start)
    expect(restarted.exitCode, String(restarted.stderr)).toBe(0)
    expect(JSON.parse(String(restarted.stdout))).toMatchObject({
      cwd: launcher.repository,
      originalFolder: '/home/user/code/original',
      clonedFolder: '/home/user/code/cloned',
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
