import { afterEach, describe, expect, test, vi } from 'vitest'
import { automationPaths } from '../../shared/automations'
import { secretPath } from '../../shared/secrets'
import { workspaceViewPath } from '../../shared/workspace-view'
import { readViewReply } from '../../chat/api/read-view'
import { FakeApiServer } from '../../test-support/fake-api'
import { FakeWorkspaceEvents } from '../../test-support/fake-events'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { createApiClient } from '../api/client'
import { ignore } from '../api/parse'
import {
  readAutomationRunResponse,
  readAutomationRunsResponse,
} from '../api/read-automation-runs'
import { createBackend, guardScope } from './backend'
import { readDevOptions } from './options'
import { routeFetch } from './router'
import { runRoutes } from './run-routes'
import { secretRoutes } from './secret-routes'
import { orgSecretsOf } from './secret-store'
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
      [...runRoutes(backend), ...secretRoutes(backend)],
      (path, method) => guardScope(backend.state, path, method),
      new FakeApiServer().fetch,
    ),
  )
  const acme = backend.state.orgs.find((org) => org.org.id === orgId)
  if (!acme) throw new Error('The seed has no Acme.')
  return { api, acme, backend }
}

function runs(
  api: ReturnType<typeof setup>['api'],
  id: string,
  before?: string,
) {
  return api.get(
    automationPaths.runs(orgId, id, before),
    readAutomationRunsResponse,
  )
}

function runNow(
  api: ReturnType<typeof setup>['api'],
  id: string,
  requestId: string,
) {
  return api.send(
    'POST',
    automationPaths.runNow(orgId, id),
    { requestId },
    readAutomationRunResponse,
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

  test('Run now starts a workspace in the section of the automation, once for each request ID', async () => {
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

  test('Run now pre-approves the chosen secrets of the automation in its workspace, with Mac access off', async () => {
    const { api, acme, backend } = setup()
    acme.automations = acme.automations.map((automation) =>
      automation.id === 'error-triage'
        ? {
            ...automation,
            capabilities: { preapprovedSecretIds: ['figma-token'] },
          }
        : automation,
    )
    const run = await runNow(api, 'error-triage', 'request-secrets')
    const grants = orgSecretsOf(backend.state, orgId).capabilities.get(
      run.workspaceId ?? '',
    )
    expect({
      preapproved: grants?.preapprovedSecretIds,
      macAccess: grants?.macAccess,
    }).toEqual({ preapproved: ['figma-token'], macAccess: false })
  })

  test('Run now goes on without a chosen secret that was deleted', async () => {
    const { api, acme, backend } = setup()
    acme.automations = acme.automations.map((automation) =>
      automation.id === 'error-triage'
        ? {
            ...automation,
            capabilities: {
              preapprovedSecretIds: ['figma-token', 'vercel-token'],
            },
          }
        : automation,
    )
    await api.send('DELETE', secretPath(orgId, 'figma-token'), {}, ignore)
    const run = await runNow(api, 'error-triage', 'request-deleted')
    const grants = orgSecretsOf(backend.state, orgId).capabilities.get(
      run.workspaceId ?? '',
    )
    expect({
      state: run.state,
      preapproved: grants?.preapprovedSecretIds,
    }).toEqual({ state: 'starting', preapproved: ['vercel-token'] })
  })

  test('Run now refuses another owner and an automation of pull requests, fails without an agent login, and keeps the workspace of a start that failed', async () => {
    const { api } = setup()
    await expect(
      runNow(api, 'dependency-updates', 'request-1'),
    ).rejects.toMatchObject({ status: 403, code: 'automation_owner_required' })
    await expect(runNow(api, 'review-prs', 'request-1')).rejects.toMatchObject({
      status: 409,
      code: 'automation_pull_request_required',
    })
    const run = await runNow(setup('?login=none').api, 'error-triage', 'r')
    // A prompt that contains `fail` stands for a cloud computer that did
    // not start, and its run keeps the workspace, as the Worker does.
    const start = setup()
    const { acme } = start
    acme.automations = acme.automations.map((item) =>
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
        message: 'Connect Claude to run this automation.',
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

  test('the view of a run workspace names its automation and the pull request of its run', async () => {
    const path = workspaceViewPath(orgId, FAKE_IDS.workspace)
    const automationOf = async (search: string) =>
      (await setup(search).api.get(path, readViewReply)).automation
    expect({
      person: await automationOf(''),
      pullRequest: await automationOf('?run=pull-request'),
      schedule: await automationOf('?run=schedule'),
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
