import type { WebSocket } from 'miniflare'
import { beforeAll, expect, it } from 'vitest'

import { chatHistoryPath } from '../../src/shared/events'
import { githubPaths } from '../../src/shared/github'
import { workspaceViewPath } from '../../src/shared/workspace-view'
import { workspacePaths } from '../../src/shared/workspaces'
import { closeSockets } from '../chat/adapter-sockets.test-support'
import { record, string } from '../chat/inputs'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import {
  OuterFakeRunner,
  requestRunner,
} from '../chat/integration/runner-socket.test-support'
import { passedRun, repositoryPull } from '../github/fake-pull'
import { RepositoryGitHub } from '../github/fake-repository'
import { REPOSITORY_CHANGE_JOB_KEY } from '../lifecycle/repository-change-types'
import { readWorkspaceToken } from '../lifecycle/tokens'
import { continueRoutesFixture } from './continue-routes.test-support'

const OLD_FOLDER = '/home/user/code/hello-world'
const NEW_FOLDER = '/home/user/code/billing'

let bundle: string
beforeAll(async () => {
  bundle = await outerWorkerBundle(
    'worker/features/continue-entry.test-support.ts',
  )
})

it('changes the repository through real routes: refusals, a runner that cannot move, the change, the runner move, and GitHub events of the new repository', async () => {
  const f = await continueRoutesFixture(bundle)
  const sockets: WebSocket[] = []
  try {
    expect((await f.queueOldBranch()).status).toBe(204)
    const billing = new RepositoryGitHub(f.github)
    billing.repositoryId = 77
    billing.fullName = 'example/billing'
    billing.defaultBranch = 'trunk'
    billing.branches = new Map([['refs/heads/trunk', 'trunk-commit']])
    billing.pulls = {}
    f.others.push(billing)
    await f.env.DB.batch([
      f.env.DB.prepare(
        "INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch, installation_id, selected) VALUES ('billing-repository', ?, 77, 'example/billing', 'trunk', 1, 1), ('unheld', ?, 78, 'example/unheld', 'main', 1, 0)",
      ).bind(OUTER_ORG, OUTER_ORG),
      f.env.DB.prepare(
        'UPDATE workspace_runtime SET repository_locations_json = ? WHERE workspace_id = ?',
      ).bind(
        JSON.stringify([
          {
            repositoryId: 'billing-repository',
            directory: NEW_FOLDER,
            variable: 'CONDUCTIVE_REPOSITORY_BILLING_DIR',
          },
          {
            repositoryId: 'chat-repository',
            directory: OLD_FOLDER,
            variable: 'CONDUCTIVE_REPOSITORY_HELLO_WORLD_DIR',
          },
        ]),
        OUTER_WORKSPACE,
      ),
    ])
    expect(
      await (
        await f.request(workspaceViewPath(OUTER_ORG, OUTER_WORKSPACE))
      ).json(),
    ).toMatchObject({
      heldRepositoryIds: ['billing-repository', 'chat-repository'],
    })
    const path = workspacePaths.repository(OUTER_ORG, OUTER_WORKSPACE)
    const post = (
      repositoryId = 'billing-repository',
      cookie = f.cookies.memberCookie,
    ) =>
      f.request(path, {
        method: 'POST',
        headers: { Cookie: cookie },
        body: JSON.stringify({
          expectedRepositoryId: 'chat-repository',
          expectedBranch: 'changes',
          repositoryId,
          allowWork: true,
        }),
      })
    const error = async (response: { json(): Promise<unknown> }) =>
      record(record(await response.json()).error)
    expect((await post(undefined, f.cookies.outsiderCookie)).status).toBe(404)
    expect((await post('unheld')).status).toBe(404)
    const bad = await f.request(path, { method: 'POST', body: '{}' })
    expect(bad.status).toBe(400)
    await bad.arrayBuffer()
    const drive = async (ready: (state: Map<string, unknown>) => boolean) => {
      for (let step = 0; step < 30; step++) {
        const current = await f.state()
        if (ready(current)) return current
        await f.control('seed', {
          values: { 'alarm:repository-change': 0, 'alarm:lifecycle': 0 },
        })
        await f.control('advance')
      }
      throw new Error('The change did not reach its expected state.')
    }
    const first = await post()
    expect(first.status).toBe(202)
    const firstId = string(record(await first.json()).changeId)
    await drive(
      (state) =>
        record(state.get('lifecycle:start-job') ?? {}).phase === 'runner',
    )
    const token = await readWorkspaceToken(f.env, OUTER_WORKSPACE)
    const old = await requestRunner(f, token)
    if (!old.webSocket) throw new Error('Missing runner socket.')
    sockets.push(old.webSocket)
    const outdated = new OuterFakeRunner(old.webSocket)
    expect(record(await outdated.inbox.next()).type).toBe('welcome')
    outdated.emit({ type: 'runner.ready' })
    await drive((state) => state.get(REPOSITORY_CHANGE_JOB_KEY) === null)
    const refused = await f.request(
      workspacePaths.repositoryResult(OUTER_ORG, OUTER_WORKSPACE, firstId),
      { headers: { Cookie: f.cookies.memberCookie } },
    )
    expect(refused.status).toBe(409)
    expect(await error(refused)).toMatchObject({
      code: 'workspace_software_outdated',
      message: 'Restart the software, then try again.',
    })
    expect(await f.queuedPulls()).toEqual([2])
    let turn = record(await outdated.inbox.next())
    while (turn.type !== 'turn') turn = record(await outdated.inbox.next())
    outdated.emit({
      type: 'turn.completed',
      sessionId: f.firstSession,
      turnId: string(turn.turnId),
      state: 'finished',
      durationMs: 10,
      files: [],
      omittedFileCount: 0,
      userMessageIds: [`message-${OUTER_WORKSPACE}`],
    })
    expect(record(await outdated.inbox.next()).type).toBe('confirm')
    const again = await post()
    expect(again.status).toBe(409)
    expect(await error(again)).toMatchObject({
      message: 'Restart the software, then try again.',
    })
    await closeSockets(old.webSocket)
    sockets.pop()
    const capable = await requestRunner(f, token)
    if (!capable.webSocket) throw new Error('Missing runner socket.')
    sockets.push(capable.webSocket)
    const runner = new OuterFakeRunner(capable.webSocket, OUTER_WORKSPACE, {
      streamId: 'capable-stream',
      repositoryFolder: OLD_FOLDER,
    })
    expect(record(await runner.inbox.next()).type).toBe('welcome')
    runner.emit({ type: 'runner.ready' })
    await f.env.DB.prepare(
      "UPDATE repositories SET selected = 1 WHERE id = 'unheld'",
    ).run()
    const cloneRefused = await post('unheld')
    expect(cloneRefused.status).toBe(409)
    expect(await error(cloneRefused)).toMatchObject({
      code: 'workspace_software_outdated',
      message: 'Restart the software, then try again.',
    })
    const started = await post()
    expect(started.status).toBe(202)
    const changeId = string(record(await started.json()).changeId)
    await drive((state) => state.get(REPOSITORY_CHANGE_JOB_KEY) === null)
    expect(await f.queuedPulls()).toEqual([])
    const done = await f.request(
      workspacePaths.repositoryResult(OUTER_ORG, OUTER_WORKSPACE, changeId),
      { headers: { Cookie: f.cookies.memberCookie } },
    )
    expect(done.status).toBe(200)
    const result = record(await done.json())
    expect(result.state).toBe('changed')
    const workspace = record(result.workspace)
    const branch = string(workspace.branch)
    expect(workspace).toMatchObject({
      id: OUTER_WORKSPACE,
      repositoryId: 'billing-repository',
      name: 'Kept workspace',
    })
    expect(branch).toMatch(/^owner\/kept-workspace-v2-[a-z0-9]{4}$/)
    expect(
      runner.received.filter(
        (message) => record(message).type === 'repository.move',
      ),
    ).toMatchObject([
      {
        folder: NEW_FOLDER,
        branches: { workspaceBranch: branch, targetBranch: 'trunk' },
      },
    ])
    const history = await f.request(
      chatHistoryPath(OUTER_ORG, OUTER_WORKSPACE, f.firstSession),
    )
    expect(record(await history.json()).events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: expect.objectContaining({
            type: 'workspace.repository-changed',
            repository: {
              id: 'billing-repository',
              fullName: 'example/billing',
            },
            branch,
            baseBranch: 'trunk',
          }),
        }),
      ]),
    )
    expect((await post()).status).toBe(200)
    expect((await f.webhook('changes', 'old-branch')).status).toBe(204)
    billing.branches.set(`refs/heads/${branch}`, 'changed-head')
    billing.pulls[5] = repositoryPull({
      number: 5,
      headRefName: branch,
      headRefOid: 'changed-head',
      headRepository: { databaseId: 77 },
      baseRefName: 'trunk',
      url: 'https://github.com/example/billing/pull/5',
    })
    billing.checks.set('changed-head', [passedRun])
    expect((await f.webhook(branch, 'new-branch', 77)).status).toBe(204)
    expect(
      await (
        await f.request(githubPaths.banner(OUTER_ORG, OUTER_WORKSPACE))
      ).json(),
    ).toMatchObject({
      banner: { branch, pullRequest: { number: 5, headSha: 'changed-head' } },
    })
  } finally {
    await Promise.all([closeSockets(...sockets), f.dispose()])
  }
})
