import { expect, it } from 'vitest'

import { setupBackendTests } from './backend-test-hooks'
import { defaultBranchFixture } from './default-branch-test-support'
import { workspacePhaseCommand } from './start-command'
import { readWorkspace } from './workspace-data'

const backend = setupBackendTests()

it.each(['head', 'missing-head', 'merged'] as const)(
  'fetches a %s run into its remote ref and sets the branch target',
  async (kind) => {
    const fixture = await backend()
    const h = await defaultBranchFixture(fixture)
    try {
      const base = kind === 'merged' ? 'release/next' : 'feature/review'
      await h.git('config', '--unset-all', 'remote.origin.fetch')
      const first = await h.createRemoteCommit(`refs/heads/${base}`)
      const latest = await h.createRemoteCommit(`refs/heads/${base}`, first)
      const id = h.auth.workspaceId
      const row = await readWorkspace(
        fixture.runtime.env.DB,
        fixture.org.id,
        id,
      )
      const saved = await fixture.starts.get(id)!.job()
      if (!saved || saved.kind !== 'create' || saved.phase !== 'fetch')
        throw new Error('Missing fetch job')
      const job = {
        ...saved,
        baseBranch: base,
        startSha:
          kind === 'head'
            ? first
            : kind === 'missing-head'
              ? 'b'.repeat(40)
              : undefined,
        repositoryLocations: [
          {
            repositoryId: fixture.repositoryId,
            variable: 'CONDUCTIVE_REPOSITORY_REPOSITORY_DIR',
            directory: h.directory,
          },
        ],
      }
      const fetched = await h.execute(
        workspacePhaseCommand(row, { ...job, phase: 'fetch' }),
      )
      expect(fetched.exitCode, fetched.stderr).toBe(0)
      expect(
        await h.git(
          'for-each-ref',
          '--format=%(objectname)',
          `refs/remotes/origin/${base}`,
        ),
      ).toBe(`${latest}\n`)
      const branched = await h.execute(
        workspacePhaseCommand(row, { ...job, phase: 'branch' }),
      )
      expect(branched.exitCode, branched.stderr).toBe(0)
      expect(await h.git('branch', '--show-current')).toBe(`${row.branch}\n`)
      expect(await h.git('rev-parse', 'HEAD')).toBe(
        `${kind === 'head' ? first : latest}\n`,
      )
      expect(await h.git('config', `branch.${row.branch}.gh-merge-base`)).toBe(
        `${base}\n`,
      )
      expect(
        await h.git('rev-list', '--count', 'HEAD', '--not', '--remotes=origin'),
      ).toBe('0\n')
      expect(
        h.github.requests.some((request) =>
          request.path.includes('git-receive-pack'),
        ),
      ).toBe(false)
    } finally {
      await h.dispose()
    }
  },
)
