import { symlink } from 'node:fs/promises'

import { beforeAll, expect, it } from 'vitest'

import { workspacePaths } from '../../src/shared/workspaces'
import { record } from '../chat/inputs'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OTHER_WORKSPACE,
  OUTER_ORG,
  OUTER_REPOSITORY,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { BASE_CHANGE_JOB_KEY } from '../lifecycle/base-change-job'
import { continueNativeFixture } from '../lifecycle/continue-native.test-support'
import { workspaceRepositoryLocations } from '../lifecycle/repository-location-data'
import { repositoryLocation } from '../lifecycle/repository-locations'
import { baseMoveFixture } from './base-moved.test-support'
import { featureState } from './fixture.test-support'

let bundle: string
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})

async function resumeRenamedComputer(
  f: Awaited<ReturnType<typeof baseMoveFixture>>,
  native: Awaited<ReturnType<typeof continueNativeFixture>>,
  id: string,
) {
  expect(f.fetches()).toEqual([])
  expect(await native.git('config', 'branch.changes.gh-merge-base')).toBe(
    'main\n',
  )
  expect(await f.pending()).toMatchObject({ id, failures: 1 })
  const response = await f.request(
    workspacePaths.resume(OUTER_ORG, OUTER_WORKSPACE),
    { method: 'POST', body: '{}' },
  )
  expect(response.status).toBe(200)
  await f.drive(
    (state) =>
      record(state.get('lifecycle:start-job') ?? {}).phase === 'runner',
  )
  expect(f.boat.resumeIds).toEqual(['bx_continue'])
}

const keepRunning: typeof resumeRenamedComputer = async () => {}

it.each([
  { computer: 'ready', resume: keepRunning },
  { computer: 'stopped', resume: resumeRenamedComputer },
] as const)(
  'fetches and targets a renamed default on a $computer computer with one saved move and leaves explicit bases and inactive repositories alone',
  async ({ computer, resume }) => {
    const native = await continueNativeFixture()
    const mappedDirectory = `${native.root}/workspace`
    await symlink(native.directory, mappedDirectory)
    await native.git('branch', '-m', 'changes')
    await native.git('config', 'branch.changes.gh-merge-base', 'main')
    await native.git(
      'symbolic-ref',
      'refs/remotes/origin/HEAD',
      'refs/remotes/origin/main',
    )
    await native.remoteGit('update-ref', 'refs/heads/trunk', native.latest)
    await native.remoteGit('symbolic-ref', 'HEAD', 'refs/heads/trunk')
    await native.remoteGit('update-ref', '-d', 'refs/heads/main')
    const head = await native.git('rev-parse', 'HEAD')
    await native.write('carry.txt', 'kept local work\n')
    const f = await baseMoveFixture(bundle)
    try {
      f.api.fullName = native.job.binding.fullName
      f.api.defaultBranch = 'trunk'
      await f.env.DB.batch([
        f.env.DB.prepare(
          'UPDATE repositories SET full_name = ? WHERE id = ?',
        ).bind(f.api.fullName, OUTER_REPOSITORY),
        f.env.DB.prepare(
          'UPDATE workspaces SET state = ?, base_branch = NULL WHERE id = ?',
        ).bind(computer, OUTER_WORKSPACE),
        f.env.DB.prepare(
          "UPDATE workspaces SET base_branch = 'feature/review' WHERE id = ?",
        ).bind(OTHER_WORKSPACE),
      ])
      if (computer === 'stopped') f.boat.states.set('bx_continue', 'archived')
      const directory = repositoryLocation(
        await workspaceRepositoryLocations(f.env.DB, OUTER_WORKSPACE),
        OUTER_REPOSITORY,
      )
      f.boat.beforeCommand = async (command, detached) => {
        if (detached || !command.includes('/tmp/conductive-base-change/'))
          return
        const result = await native.execute(
          command.replaceAll(directory, mappedDirectory),
        )
        expect(result.stderr).toBe('')
        f.boat.synchronousExitCode = result.exitCode ?? 1
        f.boat.synchronousOutput = result.stdout
      }
      expect((await f.repositoryWebhook('default-rename')).status).toBe(204)
      const pending = await f.pending()
      expect(pending).toMatchObject({ failures: 0 })
      if (!pending) throw new Error('The rename did not save a base move.')
      expect(await f.base()).toEqual({ base: null })
      expect(
        [...(await f.state()).keys()].filter((key) =>
          key.startsWith('baseChange:'),
        ),
      ).toEqual([BASE_CHANGE_JOB_KEY])
      expect(
        featureState(await f.control('state', {}, OTHER_WORKSPACE)).has(
          BASE_CHANGE_JOB_KEY,
        ),
      ).toBe(false)
      expect(
        await f.env.DB.prepare(
          'SELECT base_branch AS base FROM workspaces WHERE id = ?',
        )
          .bind(OTHER_WORKSPACE)
          .first(),
      ).toEqual({ base: 'feature/review' })
      expect((await f.repositoryWebhook('default-rename')).status).toBe(204)
      expect(await f.pending()).toMatchObject({ id: pending.id })
      await f.control('advance', { at: pending.at })
      await resume(f, native, pending.id)
      expect(f.fetches()).toHaveLength(1)
      expect(f.settings()).toHaveLength(1)
      expect(await f.pending()).toBeNull()
      expect(native.credentialIds).toEqual([pending.id])
      expect(await native.git('rev-parse', 'origin/trunk')).toBe(
        `${native.latest}\n`,
      )
      expect(await native.git('config', 'branch.changes.gh-merge-base')).toBe(
        'trunk\n',
      )
      expect(await native.git('symbolic-ref', 'refs/remotes/origin/HEAD')).toBe(
        'refs/remotes/origin/trunk\n',
      )
      expect(await native.git('rev-parse', 'HEAD')).toBe(head)
      expect(await native.read('carry.txt')).toBe('kept local work\n')
      expect(await f.pending()).toBeNull()
      expect(await f.base()).toEqual({ base: null })
      await f.env.DB.exec(
        'UPDATE github_installations SET suspended_at = 1 WHERE id = 1',
      )
      f.api.defaultBranch = 'release'
      expect((await f.repositoryWebhook('inactive-repository')).status).toBe(
        204,
      )
      expect(
        await f.env.DB.prepare(
          'SELECT default_branch AS branch FROM repositories WHERE id = ?',
        )
          .bind(OUTER_REPOSITORY)
          .first(),
      ).toEqual({ branch: 'trunk' })
      expect(await f.pending()).toBeNull()
      expect(f.fetches()).toHaveLength(1)
    } finally {
      await f.dispose()
    }
  },
)
