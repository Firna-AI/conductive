import { expect, it } from 'vitest'

import { FileReporter } from '../../runner/src/files'
import { Repository } from '../../runner/src/repository'
import type { RunnerFileEvent } from '../../src/shared/files'
import { parseDiff } from '../files/content'
import { continueNativeFixture } from './continue-native.test-support'
import { readSavedScript } from './saved-script'
import { workspacePhaseCommand } from './start-command'
import { workspaceBaseCommand } from './workspace-base-command'

it('moves GitHub CLI targeting, runner changes, and strict diff replies to the default without moving the workspace branch', async () => {
  const f = await continueNativeFixture()
  await f.git('update-ref', 'refs/remotes/origin/feature/review', 'HEAD')
  await f.git('config', 'branch.owner/old.gh-merge-base', 'feature/review')
  await f.git(
    'symbolic-ref',
    'refs/remotes/origin/HEAD',
    'refs/remotes/origin/feature/review',
  )
  const repository = new Repository(f.directory)
  const events: RunnerFileEvent[] = []
  const reporter = new FileReporter(
    repository,
    'feature/review',
    async (event) => {
      events.push(event)
    },
  )
  await reporter.refresh(true)
  const head = await f.git('rev-parse', 'HEAD')
  await f.write('carry.txt', 'kept work\n')
  const result = await f.execute(
    workspaceBaseCommand({
      directory: f.directory,
      branch: 'owner/old',
      baseBranch: 'main',
    }),
  )
  expect(result.exitCode, result.stderr).toBe(0)
  expect(await f.git('config', 'branch.owner/old.gh-merge-base')).toBe('main\n')
  expect(await f.git('symbolic-ref', 'refs/remotes/origin/HEAD')).toBe(
    'refs/remotes/origin/main\n',
  )
  expect(await f.git('branch', '--show-current')).toBe('owner/old\n')
  expect(await f.git('rev-parse', 'HEAD')).toBe(head)
  expect(await f.read('carry.txt')).toBe('kept work\n')
  await reporter.refresh()
  expect(events.at(-1)).toMatchObject({
    type: 'changes.updated',
    changes: { baseBranch: 'main', files: [{ path: 'carry.txt' }] },
  })
  expect(
    parseDiff(await repository.diff('carry.txt', 'main'), 'carry.txt', 'main'),
  ).toMatchObject({
    baseBranch: 'main',
    oldContent: 'original\n',
    newContent: 'kept work\n',
  })
})

it('syncs the workspace base while another branch is checked out', async () => {
  const f = await continueNativeFixture()
  await f.git('checkout', '--quiet', '-b', 'agent/work')
  const result = await f.execute(
    workspaceBaseCommand({
      directory: f.directory,
      branch: 'owner/old',
      baseBranch: 'main',
    }),
  )
  expect(result.exitCode, result.stderr).toBe(0)
  expect(await f.git('config', 'branch.owner/old.gh-merge-base')).toBe('main\n')
  expect(await f.git('symbolic-ref', 'refs/remotes/origin/HEAD')).toBe(
    'refs/remotes/origin/main\n',
  )
  expect(await f.git('branch', '--show-current')).toBe('agent/work\n')
})

async function resumeStartupFixture(baseBranch = 'main') {
  const f = await continueNativeFixture()
  const command = workspacePhaseCommand(
    { repositoryId: 'repository', branch: 'owner/old', baseBranch },
    {
      workspaceId: 'workspace',
      orgId: 'org',
      providerAccount: 'boat',
      imageName: null,
      startupScript: readSavedScript("printf '%s\\n' 'startup ran'"),
      environmentCiphertext: null,
      defaultBranch: baseBranch,
      repositoryLocations: [
        {
          repositoryId: 'repository',
          variable: 'CONDUCTIVE_REPOSITORY_REPOSITORY_DIR',
          directory: f.directory,
        },
      ],
      turnId: 'turn',
      attempt: 'resume',
      kind: 'resume',
      phase: 'startup',
      processId: null,
      stdoutOffset: 0,
      stderrOffset: 0,
    },
    null,
  )
  const local = command
    .replaceAll(
      'sudo -n install -d -m 700 -o user -g user /run/conductive',
      'install -d -m 700 /run/conductive',
    )
    .replaceAll('/run/conductive', `${f.root}/runtime`)
    .replaceAll('. /run/ascii-secrets/env.sh', ':')
    .replaceAll(
      'sudo -n systemctl restart conductive-runner.service',
      "printf '%s\\n' 'runner restarted'",
    )
  return {
    ...f,
    startup: () =>
      f.execute(
        `export CONDUCTIVE_REPOSITORY_DIR=${f.quote(f.directory)}\n${local}`,
      ),
  }
}

it.each([
  { mode: 'live', stdout: '' },
  { mode: 'resume', stdout: 'startup ran\nrunner restarted\n' },
])(
  'keeps both base settings and file reports on $mode when the new remote ref is missing',
  async ({ mode, stdout }) => {
    const f = await resumeStartupFixture('trunk')
    await f.git('config', 'branch.owner/old.gh-merge-base', 'main')
    await f.git(
      'symbolic-ref',
      'refs/remotes/origin/HEAD',
      'refs/remotes/origin/main',
    )
    const repository = new Repository(f.directory)
    const events: RunnerFileEvent[] = []
    const reporter = new FileReporter(repository, 'trunk', async (event) => {
      events.push(event)
    })
    await reporter.refresh(true)
    await f.write('carry.txt', 'kept work\n')
    const head = await f.git('rev-parse', 'HEAD')
    const result = await (mode === 'resume'
      ? f.startup()
      : f.execute(
          workspaceBaseCommand({
            directory: f.directory,
            branch: 'owner/old',
            baseBranch: 'trunk',
          }),
        ))
    expect(result.exitCode, result.stderr).toBe(0)
    expect(result.stdout).toBe(stdout)
    expect(await f.git('config', 'branch.owner/old.gh-merge-base')).toBe(
      'main\n',
    )
    expect(await f.git('symbolic-ref', 'refs/remotes/origin/HEAD')).toBe(
      'refs/remotes/origin/main\n',
    )
    expect(await f.git('branch', '--show-current')).toBe('owner/old\n')
    expect(await f.git('rev-parse', 'HEAD')).toBe(head)
    await reporter.refresh()
    expect(events.at(-1)).toMatchObject({
      type: 'changes.updated',
      changes: { baseBranch: 'main', files: [{ path: 'carry.txt' }] },
    })
  },
)

it.each([
  {
    head: 'another branch',
    checkout: ['checkout', '--quiet', '-b', 'agent/work'],
    branch: 'agent/work\n',
  },
  {
    head: 'a detached HEAD',
    checkout: ['checkout', '--quiet', '--detach', 'HEAD'],
    branch: '',
  },
])('resumes from $head and still sets the workspace base', async (input) => {
  const f = await resumeStartupFixture()
  await f.git(...input.checkout)
  const head = await f.git('rev-parse', 'HEAD')
  const result = await f.startup()
  expect(result.exitCode, result.stderr).toBe(0)
  expect(result.stdout).toBe('startup ran\nrunner restarted\n')
  expect(await f.git('config', 'branch.owner/old.gh-merge-base')).toBe('main\n')
  expect(await f.git('symbolic-ref', 'refs/remotes/origin/HEAD')).toBe(
    'refs/remotes/origin/main\n',
  )
  expect(await f.git('branch', '--show-current')).toBe(input.branch)
  expect(await f.git('rev-parse', 'HEAD')).toBe(head)
})

it('runs the startup script and runner when a base metadata write fails', async () => {
  const f = await resumeStartupFixture()
  await f.git('config', 'branch.owner/old.gh-merge-base', 'feature/review')
  await f.write('.git/config.lock', 'held config write\n')
  const result = await f.startup()
  expect(result.exitCode, result.stderr).toBe(0)
  expect(result.stdout).toBe('startup ran\nrunner restarted\n')
  expect(result.stderr).toBe('')
  expect(await f.git('config', 'branch.owner/old.gh-merge-base')).toBe(
    'feature/review\n',
  )
})
