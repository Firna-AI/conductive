import { beforeAll, expect, it } from 'vitest'

import { chatHistoryPath } from '../../src/shared/events'
import { githubPaths } from '../../src/shared/github'
import { sessionPaths } from '../../src/shared/sessions'
import { workspacePaths } from '../../src/shared/workspaces'
import { closeSockets } from '../chat/adapter-sockets.test-support'
import { CLAUDE } from '../chat/harness.test-support'
import { record, string } from '../chat/inputs'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_TOKEN,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import {
  OuterFakeRunner,
  requestRunner,
} from '../chat/integration/runner-socket.test-support'
import { repositoryPull, passedRun } from '../github/fake-pull'
import { CONTINUE_JOB_KEY } from '../lifecycle/continue-types'
import { readWorkspaceToken } from '../lifecycle/tokens'
import { continueRoutesFixture } from './continue-routes.test-support'

let bundle: string
beforeAll(async () => {
  bundle = await outerWorkerBundle(
    'worker/features/continue-entry.test-support.ts',
  )
})

it('resumes Continue through real routes, fences sends and Archive, expires recovered credentials, and routes new-branch GitHub events', async () => {
  const f = await continueRoutesFixture(bundle)
  let runner: OuterFakeRunner | undefined
  try {
    const path = workspacePaths.continue(OUTER_ORG, OUTER_WORKSPACE)
    const input = { expectedBranch: 'changes', allowLocalWork: true }
    const post = (cookie = f.cookies.memberCookie) =>
      f.request(path, {
        method: 'POST',
        headers: { Cookie: cookie },
        body: JSON.stringify(input),
      })
    expect((await post(f.cookies.outsiderCookie)).status).toBe(404)
    await f.env.DB.prepare('UPDATE orgs SET suspended_at = 1 WHERE id = ?')
      .bind(OUTER_ORG)
      .run()
    expect((await post()).status).toBe(403)
    await f.env.DB.prepare('UPDATE orgs SET suspended_at = NULL WHERE id = ?')
      .bind(OUTER_ORG)
      .run()
    await f.env.DB.prepare('UPDATE workspaces SET archived_at = 1 WHERE id = ?')
      .bind(OUTER_WORKSPACE)
      .run()
    expect((await post()).status).toBe(409)
    await f.env.DB.prepare(
      'UPDATE workspaces SET archived_at = NULL WHERE id = ?',
    )
      .bind(OUTER_WORKSPACE)
      .run()
    const response = await post()
    expect(response.status).toBe(202)
    const pending = record(await response.json())
    const continueId = string(pending.continueId)
    expect(await (await post()).json()).toEqual(pending)
    const queued = await f.request(
      sessionPaths.messages(OUTER_ORG, OUTER_WORKSPACE, f.firstSession),
      {
        method: 'POST',
        headers: { Cookie: f.cookies.memberCookie },
        body: JSON.stringify({
          id: 'during-continue',
          text: 'The next task',
          choice: CLAUDE,
          attachmentIds: [],
        }),
      },
    )
    expect(queued.status).toBe(202)
    await f.drive(
      (state) =>
        record(state.get('lifecycle:start-job') ?? {}).phase === 'runner',
    )
    expect(f.boat.resumeIds).toEqual(['bx_continue'])
    const token = await readWorkspaceToken(f.env, OUTER_WORKSPACE)
    expect(token).not.toBe(OUTER_TOKEN)
    const resumed = f.boat.server.requests.find((request) =>
      new URL(request.url).pathname.endsWith('/resume'),
    )
    expect(resumed).toBeDefined()
    if (!resumed) throw new Error('Missing native resume.')
    expect(record(record(await resumed.json()).env).WORKSPACE_TOKEN).toBe(token)
    const connection = await requestRunner(f, token)
    expect(connection.status).toBe(101)
    if (!connection.webSocket) throw new Error('Missing runner socket.')
    runner = new OuterFakeRunner(connection.webSocket)
    expect(record(await runner.inbox.next()).type).toBe('welcome')
    runner.emit({ type: 'runner.ready' })
    expect(record(await runner.inbox.next()).type).toBe('confirm')
    await f.actor().readChatWorkspaceSummary()
    expect(
      runner.received.filter((message) => record(message).type === 'turn'),
    ).toEqual([])
    f.boat.commandRunning = true
    const fetching = await f.drive((state) => {
      const job = record(state.get(CONTINUE_JOB_KEY) ?? {})
      return job.phase === 'fetch' && typeof job.processId === 'number'
    })
    const fetchId = string(record(fetching.get(CONTINUE_JOB_KEY)).fetchId)
    expect(
      runner.received.filter((message) => record(message).type === 'turn'),
    ).toEqual([])
    expect(await (await f.credential(token, fetchId)).json()).toEqual({
      token: 'member-continue-token',
    })
    const archived = await f.request(
      workspacePaths.archive(OUTER_ORG, OUTER_WORKSPACE),
      { method: 'POST', body: '{}' },
    )
    expect(archived.status).toBe(409)
    expect(await archived.json()).toMatchObject({
      error: { code: 'workspace_continuing' },
    })
    expect(f.boat.deletedIds).toEqual([])
    expect(
      (
        await f.request(workspacePaths.resume(OUTER_ORG, OUTER_WORKSPACE), {
          method: 'POST',
          body: '{}',
        })
      ).status,
    ).toBe(200)
    expect(f.boat.resumeIds).toEqual(['bx_continue'])
    await closeSockets(runner.socket)
    runner = undefined
    const interrupted = await f.request(
      `/__test/continue-restart?workspace=${encodeURIComponent(OUTER_WORKSPACE)}`,
      { method: 'POST', body: '{}' },
    )
    expect(interrupted.status).toBe(500)
    await interrupted.arrayBuffer()
    expect((await f.credential(token, fetchId)).status).toBe(409)
    f.boat.commandRunning = false
    await f.drive((state) => state.get(CONTINUE_JOB_KEY) === null)
    const resultPath = workspacePaths.continueResult(
      OUTER_ORG,
      OUTER_WORKSPACE,
      continueId,
    )
    const completed = await f.request(resultPath, {
      headers: { Cookie: f.cookies.memberCookie },
    })
    expect(completed.status).toBe(200)
    const result = record(await completed.json())
    expect(result.state).toBe('continued')
    const workspace = record(result.workspace)
    const branch = string(workspace.branch)
    expect(workspace).toMatchObject({
      id: OUTER_WORKSPACE,
      name: 'Kept workspace',
      owner: { id: 'owner' },
    })
    expect(branch).toMatch(/^owner\/[a-z]+-[a-z0-9]{4}$/)
    const history = await f.request(
      chatHistoryPath(OUTER_ORG, OUTER_WORKSPACE, f.firstSession),
    )
    expect(record(await history.json()).events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: {
            type: 'workspace.continued',
            sessionId: f.firstSession,
            member: {
              id: 'member',
              githubLogin: 'member',
              displayName: null,
              avatarUrl: null,
            },
            branch,
            baseBranch: 'main',
          },
        }),
      ]),
    )
    const commands = f.boat.commandRequests.filter(
      ({ detached, command }) =>
        detached && command.includes('conductive-continue'),
    )
    expect(commands).toHaveLength(2)
    expect(await (await post()).json()).toEqual(result)
    expect(
      f.boat.commandRequests.filter(
        ({ detached, command }) =>
          detached && command.includes('conductive-continue'),
      ),
    ).toHaveLength(2)
    const fresh = await requestRunner(f, token)
    if (!fresh.webSocket) throw new Error('Missing reconnected runner.')
    runner = new OuterFakeRunner(fresh.webSocket, OUTER_WORKSPACE, {
      streamId: 'continued-stream',
    })
    expect(record(await runner.inbox.next()).type).toBe('welcome')
    runner.emit({ type: 'runner.ready' })
    expect(record(await runner.inbox.next()).type).toBe('confirm')
    expect(record(await runner.inbox.next())).toMatchObject({
      type: 'turn',
      branches: { workspaceBranch: branch, targetBranch: 'main' },
    })
    const banner = await f.request(
      githubPaths.banner(OUTER_ORG, OUTER_WORKSPACE),
    )
    expect(await banner.json()).toMatchObject({
      banner: { branch, state: 'no-commits', pullRequest: null },
    })
    expect((await f.webhook('changes', 'old-continue-branch')).status).toBe(204)
    f.api.branches.set(`refs/heads/${branch}`, 'continued-head')
    f.api.pulls[3] = repositoryPull({
      number: 3,
      headRefName: branch,
      headRefOid: 'continued-head',
    })
    f.api.checks.set('continued-head', [passedRun])
    expect((await f.webhook(branch, 'new-continue-branch')).status).toBe(204)
    expect(
      await (
        await f.request(githubPaths.banner(OUTER_ORG, OUTER_WORKSPACE))
      ).json(),
    ).toMatchObject({
      banner: {
        branch,
        state: 'ready-to-merge',
        pullRequest: { number: 3, headSha: 'continued-head' },
      },
    })
    expect(f.api.pulls[2].state).toBe('MERGED')
  } finally {
    if (runner) await closeSockets(runner.socket)
    await f.dispose()
  }
})
