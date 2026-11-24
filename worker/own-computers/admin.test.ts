import { expect, it } from 'vitest'

import {
  ownComputerBuildsPath,
  ownComputerCodePath,
  ownComputerPath,
  ownComputersPath,
  type OwnComputerCodeResponse,
  type OwnComputersResponse,
} from '../../src/shared/own-computers'
import { seedMember, seedWorkspace } from '../test-support/d1-seeds'
import { TEST_TIME } from '../test-support/harness'
import { setupOwnComputers } from './fixture.test-support'

const setup = setupOwnComputers()

function computerActions(orgId: string, id: string) {
  const path = ownComputerPath(orgId, id)
  const code = ownComputerCodePath(orgId, id)
  return {
    read: [path, 'GET'] as const,
    control: [
      [path, 'PATCH'],
      [path, 'DELETE'],
      [code, 'GET'],
      [code, 'POST'],
      [ownComputerBuildsPath(orgId, id), 'POST'],
    ] as const,
  }
}

const missingComputer = {
  error: {
    code: 'own_computer_not_found',
    message: 'The own computer is not available.',
  },
}

it('adds trimmed names, keeps add order, and shows the same unused code to an admin', async () => {
  const f = await setup()
  expect((await f.request(f.root, 'POST', { name: '   ' })).status).toBe(400)

  const first = await f.add('  Server  ')
  expect(first.expiresAt).toBe(1_800_003_600_000)
  expect(
    /^(?:[0-9A-HJKMNP-TV-Z]{4}-){3}[0-9A-HJKMNP-TV-Z]{4}$/.test(first.code),
  ).toBe(true)
  expect(first.computer).toEqual({
    id: first.computerId,
    name: 'Server',
    connection: {
      kind: 'waiting',
      codeExpiresAt: 1_800_003_600_000,
      codeAvailable: true,
    },
    resources: null,
    limit: null,
    defaultLimit: null,
    runningWorkspaces: 0,
    workspaces: 0,
    buildRequestedAt: null,
    addedAt: TEST_TIME,
  })
  const show = await f.request(first.codePath)
  expect(show.status).toBe(200)
  const code: OwnComputerCodeResponse = await show.json()
  expect(code.code === first.code).toBe(true)
  expect(code.expiresAt).toBe(first.expiresAt)

  f.harness.setTime(TEST_TIME + 1)
  const second = await f.add('Server')
  const response = await f.request(f.root)
  expect(response.status).toBe(200)
  const list: OwnComputersResponse = await response.json()
  expect(list).toEqual({ computers: [first.computer, second.computer] })

  f.harness.setTime(1_800_003_600_000)
  expect((await first.read()).connection).toEqual({ kind: 'expired' })
  expect((await f.request(first.codePath)).status).toBe(409)
})

it('lets members read computer records and reserves each control for admins', async () => {
  const f = await setup()
  const added = await f.add()
  f.harness.github.profile = { id: 8, login: 'member', name: 'Member' }
  const session = await f.harness.login()
  await seedMember(f.db, {
    orgId: f.org.id,
    userId: { githubId: 8 },
    role: 'member',
    joinedAt: TEST_TIME,
  }).run()

  const list = await f.harness.request(f.root, session)
  expect(list.status).toBe(200)
  expect(await list.json()).toEqual({ computers: [added.computer] })
  const read = await f.harness.request(added.path, session)
  expect(read.status).toBe(200)
  expect(await read.json()).toEqual({ computer: added.computer })

  const controls = [
    [f.root, 'POST'],
    ...computerActions(f.org.id, added.computerId).control,
  ]
  const refusals = await Promise.all(
    controls.map(([path, method]) =>
      f.harness.request(path, session, {
        method,
        ...(method !== 'GET' && {
          body: JSON.stringify({ name: 'Server', limit: 2 }),
        }),
      }),
    ),
  )
  for (const response of refusals) {
    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      error: {
        code: 'admin_required',
        message: 'Ask an org admin to make this change.',
      },
    })
  }
})

it('gives an admin of another org the same reply as for an unknown computer', async () => {
  const f = await setup()
  const added = await f.add()
  f.harness.github.profile = { id: 9, login: 'other', name: 'Other admin' }
  const session = await f.harness.login()
  const other = await f.createOrg(9)
  const list = await f.harness.request(ownComputersPath(other.id), session)
  expect(list.status).toBe(200)
  expect(await list.json()).toEqual({ computers: [] })

  const actions = [added.computerId, 'unknown-computer'].flatMap((id) => {
    const { read, control } = computerActions(other.id, id)
    return [read, ...control]
  })
  const refusals = await Promise.all(
    actions.map(([path, method]) =>
      f.harness.request(path, session, {
        method,
        ...(method !== 'GET' && { body: JSON.stringify({ limit: 2 }) }),
      }),
    ),
  )
  for (const response of refusals) {
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual(missingComputer)
  }
})

it('requires a first welcome for limit and build requests and saves an admin build request', async () => {
  const f = await setup()
  const added = await f.add()
  for (const [path, method] of [
    [added.path, 'PATCH'],
    [added.buildsPath, 'POST'],
  ]) {
    const response = await f.request(path, method, { limit: 2 })
    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      error: {
        code: 'computer_never_connected',
        message: 'Connect the own computer first.',
      },
    })
  }
  await added.connect()
  expect((await f.request(added.codePath, 'POST')).status).toBe(409)

  const invalid = await Promise.all(
    [0, 1.5, '2', 9_007_199_254_740_992].map((limit) =>
      f.request(added.path, 'PATCH', { limit }),
    ),
  )
  expect(invalid.map((response) => response.status)).toEqual([
    400, 400, 400, 400,
  ])
  const limit = await f.request(added.path, 'PATCH', {
    limit: 9_007_199_254_740_991,
  })
  expect(limit.status).toBe(200)
  expect(await limit.json()).toMatchObject({
    computer: { limit: 9_007_199_254_740_991 },
  })

  const response = await f.request(added.buildsPath, 'POST')
  expect(response.status).toBe(202)
  expect(await response.json()).toMatchObject({
    computer: { buildRequestedAt: TEST_TIME },
  })
  const actor = await f.db
    .prepare(
      `SELECT build_requested_by_user_id = o.creator_user_id AS attributed
     FROM own_computers c JOIN orgs o ON c.org_id = o.id WHERE c.id = ?`,
    )
    .bind(added.computerId)
    .first('attributed')
  expect(actor).toBe(1)
})

it('counts running and total workspaces on the computer', async () => {
  const f = await setup()
  const added = await f.add()
  await added.connect()
  await f.db
    .prepare(
      `INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch)
     VALUES ('repo', ?, 10, 'fixture/repo', 'main')`,
    )
    .bind(f.org.id)
    .run()
  await f.db.batch([
    ...(
      [
        { id: 'running', state: 'ready' },
        { id: 'stopped', state: 'stopped' },
        { id: 'archived', state: 'ready', archivedAt: TEST_TIME },
      ] as const
    ).map((workspace) =>
      seedWorkspace(f.db, {
        orgId: f.org.id,
        repositoryId: 'repo',
        ownerUserId: { githubId: 7 },
        name: workspace.id,
        branch: workspace.id,
        createdAt: TEST_TIME,
        updatedAt: TEST_TIME,
        ...workspace,
      }),
    ),
    f.db
      .prepare('UPDATE workspaces SET computer_id = ? WHERE org_id = ?')
      .bind(added.computerId, f.org.id),
  ])
  expect(await added.read()).toMatchObject({
    runningWorkspaces: 1,
    workspaces: 3,
  })
})
