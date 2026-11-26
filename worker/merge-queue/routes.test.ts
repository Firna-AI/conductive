import { beforeAll, expect, it } from 'vitest'

import { readWorkspaces } from '../../src/app/api/read-workspaces'
import { githubPaths } from '../../src/shared/github'
import { workspacePaths, workspacesPath } from '../../src/shared/workspaces'
import {
  OTHER_WORKSPACE,
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { requireFeatureResult } from '../features/result'
import { activeWorkspace } from '../github/data'
import { createPullRequestStack } from '../github/stack-client'
import {
  MEMBER_TOKEN,
  PARALLEL,
  queueBundle,
  queueFixture,
} from './queue.test-support'

let bundle: string
beforeAll(async () => {
  bundle = await queueBundle()
})

it('adds a draft member stack, moves the unit, and removes its suffix', async () => {
  const f = await queueFixture(bundle)
  try {
    const cookie = f.cookies.memberCookie
    f.api.pulls[3].isDraft = true
    await createPullRequestStack(
      f.api.fetch,
      MEMBER_TOKEN,
      f.api.fullName,
      [2, 3],
    )
    f.api.requests = []
    expect((await f.change('POST', OTHER_WORKSPACE, { cookie })).status).toBe(
      204,
    )
    expect(f.api.pulls[3].isDraft).toBe(false)
    const requests = await Promise.all(
      f.api.requests
        .filter((r) => r.method === 'POST')
        .map((r) => r.clone().text()),
    )
    const ready = requests.findIndex((request) =>
      request.includes('mutation MarkReady'),
    )
    expect(ready).toBeGreaterThanOrEqual(0)
    expect(
      f.api.requests.some(
        (r) => new URL(r.url).searchParams.get('pull_request') === '3',
      ),
    ).toBe(true)
    expect(
      f.api.requests.every(
        (r) => r.headers.get('Authorization') === `Bearer ${MEMBER_TOKEN}`,
      ),
    ).toBe(true)
    const first = await f.entries()
    expect(
      first.map(({ workspaceId, pullNumber, place, queuerUserId }) => [
        workspaceId,
        pullNumber,
        place,
        queuerUserId,
      ]),
    ).toEqual([
      [OUTER_WORKSPACE, 2, 1, 'member'],
      [OTHER_WORKSPACE, 3, 2, 'member'],
    ])
    expect(first[0].unitId).toBe(first[1].unitId)
    expect((await f.change('POST', PARALLEL)).status).toBe(204)
    expect(
      (
        await f.change('PUT', OTHER_WORKSPACE, {
          body: { beforeWorkspaceId: null },
        })
      ).status,
    ).toBe(204)
    expect(
      (await f.entries()).map(({ workspaceId, place }) => [workspaceId, place]),
    ).toEqual([
      [PARALLEL, 1],
      [OUTER_WORKSPACE, 2],
      [OTHER_WORKSPACE, 3],
    ])
    expect((await f.change('DELETE', OUTER_WORKSPACE)).status).toBe(204)
    expect(
      (await f.entries()).map(({ workspaceId, place }) => [workspaceId, place]),
    ).toEqual([[PARALLEL, 1]])
    expect(
      f.api.requests.filter(
        (r) =>
          r.method === 'PATCH' ||
          new URL(r.url).pathname.endsWith('/merge-async'),
      ),
    ).toEqual([])
  } finally {
    await f.dispose()
  }
})

it('projects queue placement and clears the archived entry', async () => {
  const f = await queueFixture(bundle)
  try {
    expect((await f.change('POST', PARALLEL)).status).toBe(204)
    expect((await f.change('POST', OTHER_WORKSPACE)).status).toBe(204)
    const [, first] = await f.entries()
    const cookie = f.cookies.memberCookie
    const workspace = await activeWorkspace(
      f.db,
      OTHER_WORKSPACE,
      OUTER_ORG,
      'owner',
    )
    if (!workspace) throw new Error('Expected the test workspace.')
    requireFeatureResult(
      await f.actor(OTHER_WORKSPACE).refreshGitHub(workspace, {
        userId: 'owner',
        requireWritable: true,
      }),
    )
    const list = await f.request(workspacesPath(OUTER_ORG), {
      headers: { Cookie: cookie },
    })
    expect(list.status).toBe(200)
    const listed = readWorkspaces(await list.json()).find(
      ({ id }) => id === OTHER_WORKSPACE,
    )
    expect(listed).toMatchObject({
      github: 'ready-to-merge',
      mergeQueue: {
        queueId: first.queueId,
        place: 3,
        unitId: first.unitId,
        state: 'queued',
        pullNumber: 3,
        removal: { base: { text: 'changes' }, above: [] },
      },
    })
    expect(listed).not.toHaveProperty('githubPullBase')
    const bar = await f.request(githubPaths.stored(OUTER_ORG, OTHER_WORKSPACE))
    expect(bar.status).toBe(200)
    expect(await bar.json()).toMatchObject({
      queue: {
        place: 3,
        count: 3,
        belowPullNumber: 2,
        trunk: 'main',
        state: 'queued',
        wait: null,
      },
    })
    const archived = await f.request(
      workspacePaths.archive(OUTER_ORG, PARALLEL),
      { method: 'POST', body: '{}' },
    )
    expect(archived.status).toBe(200)
    expect(
      (await f.entries()).map(({ workspaceId, place }) => [workspaceId, place]),
    ).toEqual([
      [OUTER_WORKSPACE, 1],
      [OTHER_WORKSPACE, 2],
    ])
  } finally {
    await f.dispose()
  }
})

it('extends a queued unit in place and accepts the same add again', async () => {
  const f = await queueFixture(bundle)
  try {
    expect((await f.change('POST', OUTER_WORKSPACE)).status).toBe(204)
    const [first] = await f.entries()
    expect((await f.change('POST', PARALLEL)).status).toBe(204)
    expect((await f.change('POST', OTHER_WORKSPACE)).status).toBe(204)
    expect((await f.change('POST', OTHER_WORKSPACE)).status).toBe(204)
    expect(
      (await f.entries()).map(({ workspaceId, place, unitId }) => [
        workspaceId,
        place,
        unitId,
      ]),
    ).toEqual([
      [OUTER_WORKSPACE, 1, first.unitId],
      [OTHER_WORKSPACE, 2, first.unitId],
      [PARALLEL, 3, expect.any(String)],
    ])
  } finally {
    await f.dispose()
  }
})
