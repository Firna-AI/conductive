import { expect, it } from 'vitest'

import { Repository } from '../../runner/src/repository'
import { setupBackendTests } from './backend-test-hooks'
import { defaultBranchFixture } from './default-branch-test-support'
import { workspacePhaseCommand } from './start-command'
import { readWorkspace } from './workspace-data'

const backend = setupBackendTests()

it('fetches start and base refs, branches from start, and points GitHub tools at the base', async () => {
  const fixture = backend()
  const h = await defaultBranchFixture(fixture)
  try {
    const main = await h.createRemoteCommit()
    const startName = "feature/it's-$(touch${IFS}injected)"
    const start = await h.createRemoteCommit(`refs/heads/${startName}`, {
      parent: main,
      message: 'Start branch',
    })
    const base = await h.createRemoteCommit('refs/heads/release/next', {
      parent: main,
      message: 'Base branch',
    })
    await h.git('config', '--unset-all', 'remote.origin.fetch')
    const row = await readWorkspace(
      fixture.runtime.env.DB,
      fixture.org.id,
      h.auth.workspaceId,
    )
    const saved = await fixture.starts.get(row.id)?.job()
    if (!saved || saved.kind !== 'create' || saved.phase !== 'fetch')
      throw new Error('Missing fetch job')
    const job = {
      ...saved,
      startBranch: startName,
      baseBranch: 'release/next',
      repositoryLocations: [
        {
          repositoryId: row.repositoryId,
          variable: 'CONDUCTIVE_REPOSITORY_REPOSITORY_DIR',
          directory: h.directory,
        },
      ],
    }
    const fetched = await h.execute(
      workspacePhaseCommand(row, { ...job, phase: 'fetch' }, null),
    )
    expect(fetched.exitCode, fetched.stderr).toBe(0)
    expect(
      await h.git(
        'for-each-ref',
        '--format=%(objectname)',
        `refs/remotes/origin/${startName}`,
      ),
    ).toBe(`${start}\n`)
    expect(await h.git('rev-parse', 'FETCH_HEAD')).toBe(`${base}\n`)
    const branched = await h.execute(
      workspacePhaseCommand(row, { ...job, phase: 'branch' }, null),
    )
    expect(branched.exitCode, branched.stderr).toBe(0)
    expect(await h.git('rev-parse', 'HEAD')).toBe(`${start}\n`)
    expect(await h.git('symbolic-ref', 'refs/remotes/origin/HEAD')).toBe(
      'refs/remotes/origin/release/next\n',
    )
    expect(await h.git('config', `branch.${row.branch}.gh-merge-base`)).toBe(
      'release/next\n',
    )
    expect(await h.git('status', '--porcelain')).toBe('')
    expect(
      await new Repository(h.directory).snapshot('release/next'),
    ).toMatchObject({ baseCommit: main })
  } finally {
    await h.dispose()
  }
})

it('bootstraps only the default branch when another start branch is missing in an empty repository', async () => {
  const fixture = backend()
  const h = await defaultBranchFixture(fixture)
  try {
    const row = await readWorkspace(
      fixture.runtime.env.DB,
      fixture.org.id,
      h.auth.workspaceId,
    )
    const job = await fixture.starts.get(row.id)?.job()
    if (!job || job.kind !== 'create' || job.phase !== 'fetch')
      throw new Error('Missing fetch job')
    const result = await h.execute(
      workspacePhaseCommand(
        row,
        {
          ...job,
          phase: 'fetch',
          startBranch: 'missing',
          baseBranch: 'missing',
          repositoryLocations: [
            {
              repositoryId: row.repositoryId,
              variable: 'CONDUCTIVE_REPOSITORY_REPOSITORY_DIR',
              directory: h.directory,
            },
          ],
        },
        null,
      ),
    )
    expect(result.exitCode).toBe(44)
    expect(result.stderr).toContain(
      'The branch `missing` is no longer on GitHub.',
    )
    expect(await h.remoteGit('for-each-ref', '--format=%(refname)')).toBe(
      'refs/heads/main\n',
    )
  } finally {
    await h.dispose()
  }
})

it.each(['start', 'base'] as const)(
  'fails the fetch with a named cause when the %s branch is deleted before start',
  async (kind) => {
    const fixture = backend()
    const h = await defaultBranchFixture(fixture)
    try {
      const main = await h.createRemoteCommit()
      await h.createRemoteCommit('refs/heads/deleted', { parent: main })
      await h.remoteGit('update-ref', '-d', 'refs/heads/deleted')
      const row = await readWorkspace(
        fixture.runtime.env.DB,
        fixture.org.id,
        h.auth.workspaceId,
      )
      const job = await fixture.starts.get(row.id)?.job()
      if (!job || job.kind !== 'create' || job.phase !== 'fetch')
        throw new Error('Missing fetch job')
      const result = await h.execute(
        workspacePhaseCommand(
          row,
          {
            ...job,
            phase: 'fetch',
            startBranch: kind === 'start' ? 'deleted' : 'main',
            baseBranch: kind === 'base' ? 'deleted' : undefined,
            repositoryLocations: [
              {
                repositoryId: row.repositoryId,
                variable: 'CONDUCTIVE_REPOSITORY_REPOSITORY_DIR',
                directory: h.directory,
              },
            ],
          },
          null,
        ),
      )
      expect(result.exitCode).toBe(kind === 'start' ? 44 : 45)
      expect(result.stderr).toContain(
        'The branch `deleted` is no longer on GitHub.',
      )
      expect(await h.remoteGit('for-each-ref', '--format=%(refname)')).toBe(
        'refs/heads/main\n',
      )
    } finally {
      await h.dispose()
    }
  },
)
