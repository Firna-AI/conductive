import { mkdir, writeFile } from 'node:fs/promises'
import { expect, it } from 'vitest'

import { continueNativeFixture } from './continue-native.test-support'
import { readSavedScript } from './saved-script'
import { workspacePhaseCommand } from './start-command'
import { workspaceBaseCommand } from './workspace-base-command'

it('moves the GitHub CLI and comparison base to the default without moving the workspace branch', async () => {
  const f = await continueNativeFixture()
  await f.git('update-ref', 'refs/remotes/origin/feature/review', 'HEAD')
  await f.git('config', 'branch.owner/old.gh-merge-base', 'feature/review')
  await f.git(
    'symbolic-ref',
    'refs/remotes/origin/HEAD',
    'refs/remotes/origin/feature/review',
  )
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
  const base = (await f.git('merge-base', 'HEAD', 'origin/main')).trim()
  expect(await f.git('diff', '--name-only', base)).toBe('carry.txt\n')
  expect(await f.git('show', `${base}:carry.txt`)).toBe('original\n')
  expect(await f.read('carry.txt')).toBe('kept work\n')
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
  const software = `${f.root}/software`
  await mkdir(`${software}/current`, { recursive: true })
  await writeFile(
    `${software}/current/conductive`,
    "#!/bin/sh\nprintf '%s\\n' 'unknown command' >&2\nexit 2\n",
    { mode: 0o755 },
  )
  const local = command
    .replaceAll(
      'sudo -n install -d -m 700 -o user -g user /run/conductive',
      'install -d -m 700 /run/conductive',
    )
    .replaceAll(
      'sudo -n flock /run/conductive/bootstrap-activate.lock systemctl restart conductive-runner.service',
      "printf '%s\\n' 'runner restarted'",
    )
    .replaceAll('sudo -n -- /bin/sh -c ', '/bin/sh -c ')
    .replaceAll('/run/conductive', `${f.root}/runtime`)
    .replaceAll('/opt/conductive', software)
    .replaceAll('. /run/ascii-secrets/env.sh', ':')
  // The startup command restarts the runner and updates the software of the
  // machine. A text that no replacement matched would run here for real.
  const unmapped = local.replaceAll(f.root, '<fixture>')
  if (/\bsudo\b|systemctl|\/opt\/|\/run\//.test(unmapped))
    throw new Error('The startup command keeps a production operation')
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
    const base = (await f.git('merge-base', 'HEAD', 'origin/main')).trim()
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
    expect(await f.git('merge-base', 'HEAD', 'origin/main')).toBe(`${base}\n`)
    expect(await f.git('diff', '--name-only', base)).toBe('carry.txt\n')
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
