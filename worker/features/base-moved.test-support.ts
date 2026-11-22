import { githubPaths } from '../../src/shared/github'
import { number, record, string } from '../chat/inputs'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { BASE_CHANGE_JOB_KEY } from '../lifecycle/base-change-job'
import { continueRoutesFixture } from './continue-routes.test-support'

export async function baseMoveFixture(
  bundle: string,
  options: Parameters<typeof continueRoutesFixture>[1] = {},
) {
  const f = await continueRoutesFixture(bundle, options)
  f.api.pulls = {}
  f.boat.states.set('bx_continue', 'ready')
  await f.env.DB.prepare(
    "UPDATE workspaces SET state = 'ready', base_branch = 'gone-stack' WHERE id = ?",
  )
    .bind(OUTER_WORKSPACE)
    .run()
  return {
    ...f,
    path: githubPaths.banner(OUTER_ORG, OUTER_WORKSPACE),
    settings: () =>
      f.boat.commandRequests.filter(({ command }) =>
        command.includes('gh-merge-base'),
      ),
    fetches: () =>
      f.boat.commandRequests.filter(({ command }) =>
        command.includes(
          'credential.helper=/usr/local/bin/conductive-git-credential',
        ),
      ),
    pending: async () => {
      const state = await f.state()
      const saved = state.get(BASE_CHANGE_JOB_KEY)
      if (!saved) return null
      const job = record(saved)
      return {
        id: string(job.id),
        at: number(job.at),
        failures: number(job.failures),
      }
    },
    base: () =>
      f.env.DB.prepare(
        'SELECT base_branch AS base FROM workspaces WHERE id = ?',
      )
        .bind(OUTER_WORKSPACE)
        .first(),
  }
}
