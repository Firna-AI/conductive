import { afterEach, describe, expect, test, vi } from 'vitest'
import { routinePaths } from '../../shared/routines'
import { workspaceViewPath } from '../../shared/workspace-view'
import { readViewReply } from '../../chat/api/read-responses'
import { FakeApiServer } from '../../test-support/fake-api'
import { FakeWorkspaceEvents } from '../../test-support/fake-events'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { createApiClient } from '../api/client'
import {
  readRoutineRunResponse,
  readRoutineRunsResponse,
} from '../api/read-routine-runs'
import { createBackend, guardScope } from './backend'
import { readDevOptions } from './options'
import { routeFetch } from './router'
import { runRoutes } from './run-routes'
import { seedState } from './seed'

const orgId = FAKE_IDS.org

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
})

function setup(search = '') {
  vi.useFakeTimers()
  const backend = createBackend(
    seedState(readDevOptions(search)),
    new FakeWorkspaceEvents([]),
    () => FAKE_TIME,
    () => 'new-id',
  )
  const api = createApiClient(
    routeFetch(
      runRoutes(backend),
      (path, method) => guardScope(backend.state, path, method),
      new FakeApiServer().fetch,
    ),
  )
  const acme = backend.state.orgs.find((org) => org.org.id === orgId)
  if (!acme) throw new Error('The seed has no Acme.')
  return { api, acme }
}

function runs(
  api: ReturnType<typeof setup>['api'],
  id: string,
  before?: string,
) {
  return api.get(routinePaths.runs(orgId, id, before), readRoutineRunsResponse)
}

function runNow(
  api: ReturnType<typeof setup>['api'],
  id: string,
  requestId: string,
) {
  return api.send(
    'POST',
    routinePaths.runNow(orgId, id),
    { requestId },
    readRoutineRunResponse,
  )
}

describe('the runs of the dev fake', () => {
  test('page by 50, newest first, and refuse a cursor that names no run', async () => {
    const { api } = setup()
    const newest = await runs(api, 'review-prs')
    const older = await runs(api, 'review-prs', newest.nextCursor ?? '')
    expect({
      newest: newest.runs.length,
      cursor: newest.nextCursor,
      first: newest.runs[0]?.id,
      older: older.runs.map((run) => run.id),
      end: older.nextCursor,
    }).toEqual({
      newest: 50,
      cursor: 'run-review-prs-opened-453',
      first: 'run-review-prs-pushed-485',
      older: [
        'run-review-prs-pushed-452',
        'run-review-prs-opened-452',
        'run-review-prs-pushed-451',
        'run-review-prs-opened-451',
        'run-review-prs-pushed-450',
        'run-review-prs-opened-450',
      ],
      end: null,
    })
    await expect(runs(api, 'review-prs', 'gone')).rejects.toMatchObject({
      status: 400,
      code: 'invalid_input',
    })
  })

  test('Run now starts a workspace in the section of the routine, once for each request ID', async () => {
    const { api, acme } = setup()
    const before = acme.workspaces.length
    const run = await runNow(api, 'error-triage', 'request-1')
    const again = await runNow(api, 'error-triage', 'request-1')
    const workspace = acme.workspaces.find(
      (item) => item.id === run.workspaceId,
    )
    expect({
      run: { id: run.id, state: run.state, trigger: run.trigger },
      again: again.id,
      added: acme.workspaces.length - before,
      workspace: workspace && {
        sectionId: workspace.sectionId,
        repositoryId: workspace.repositoryId,
        state: workspace.state,
      },
      first: (await runs(api, 'error-triage')).runs[0]?.id,
    }).toEqual({
      run: {
        id: 'run-error-triage-request-1',
        state: 'starting',
        trigger: { kind: 'run-now' },
      },
      again: 'run-error-triage-request-1',
      added: 1,
      workspace: {
        sectionId: 'infra',
        repositoryId: 'billing-service',
        state: 'starting',
      },
      first: 'run-error-triage-request-1',
    })
  })

  test('Run now refuses another owner and a routine of pull requests, fails without an agent login, and keeps the workspace of a start that failed', async () => {
    const { api } = setup()
    await expect(
      runNow(api, 'dependency-updates', 'request-1'),
    ).rejects.toMatchObject({ status: 403, code: 'routine_owner_required' })
    await expect(runNow(api, 'review-prs', 'request-1')).rejects.toMatchObject({
      status: 409,
      code: 'routine_pull_request_required',
    })
    const run = await runNow(setup('?login=none').api, 'error-triage', 'r')
    // A prompt that contains `fail` stands for a cloud computer that did
    // not start, and its run keeps the workspace, as the Worker does.
    const start = setup()
    const { acme } = start
    acme.routines = acme.routines.map((item) =>
      item.id === 'error-triage'
        ? { ...item, prompt: `${item.prompt} Then fail.` }
        : item,
    )
    const failed = await runNow(start.api, 'error-triage', 'request-2')
    const kept = acme.workspaces.find((item) => item.id === failed.workspaceId)
    expect(run).toMatchObject({
      state: 'failed',
      workspaceId: null,
      error: {
        code: 'agent_login_required',
        message: 'Connect Claude to run this routine.',
      },
    })
    expect({
      state: failed.state,
      error: failed.error,
      workspace: kept && {
        state: kept.state,
        start: acme.starts.get(kept.id)?.start?.steps.map((step) => step.state),
        error: acme.starts.get(kept.id)?.error?.code,
      },
      listed: (await runs(start.api, 'error-triage')).runs[0]?.workspaceId,
    }).toEqual({
      state: 'failed',
      error: {
        code: 'workspace_start_failed',
        message: 'The cloud computer could not start. Try again.',
      },
      workspace: {
        state: 'error',
        start: ['failed'],
        error: 'workspace_start_failed',
      },
      listed: kept?.id,
    })
  })

  test('the view of a run workspace names its routine and the pull request of its run', async () => {
    const path = workspaceViewPath(orgId, FAKE_IDS.workspace)
    const routineOf = async (search: string) =>
      (await setup(search).api.get(path, readViewReply)).routine
    expect({
      person: await routineOf(''),
      pullRequest: await routineOf('?run=pull-request'),
      schedule: await routineOf('?run=schedule'),
    }).toEqual({
      person: null,
      pullRequest: {
        id: 'review-prs',
        name: 'Review pull requests',
        pullRequest: {
          number: 482,
          url: 'https://github.com/acme/storefront/pull/482',
        },
      },
      schedule: {
        id: 'error-triage',
        name: 'Triage new errors',
        pullRequest: null,
      },
    })
  })
})
