import { mkdir, mkdtemp } from 'node:fs/promises'

import type { WebSocket } from 'miniflare'
import { afterEach, beforeAll, expect, it } from 'vitest'

import { readCreated } from '../../../src/app/api/read-workspaces'
import { sessionPaths } from '../../../src/shared/sessions'
import {
  workspacePath,
  workspacePaths,
  workspacesPath,
} from '../../../src/shared/workspaces'
import { lifecycleCommandBody } from '../../lifecycle/command-test-support'
import { seedPublishedImage } from '../../lifecycle/published-image-test-support'
import { orgEnvironmentContext } from '../../lifecycle/settings-data'
import type { WorkspaceStartResult } from '../../lifecycle/start-types'
import { readWorkspaceToken } from '../../lifecycle/tokens'
import { encrypt } from '../../security/crypto'
import { closeSockets } from '../adapter-sockets.test-support'
import { CLAUDE } from '../harness.test-support'
import { record } from '../inputs'
import { readChatHistoryPages } from './history-pages.test-support'
import {
  expireAndReadFirstStartFile,
  expectFirstStartCopies,
  FIRST_START_FILE_BYTES,
  firstStartAttachmentTransfer,
  REPAIRED_REPOSITORY_LOCATIONS,
  uploadFirstStartFile,
} from './first-start-attachments.test-support'
import type { Workspace } from './journey-entry.test-support'
import {
  createOuterRuntime,
  outerWorkerBundle,
  type OuterRuntime,
} from './outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_REPOSITORY,
  OUTER_SOFTWARE,
} from './outer-seed.test-support'
import { requestRunner } from './runner-socket.test-support'
import { connectShellRunner } from './shell-runner.test-support'
import {
  driveWorkspaceStart,
  prepareWorkspaceStart,
} from './workspace-start.test-support'

let bundle: string
let fixture: OuterRuntime | undefined
const sockets: WebSocket[] = []
beforeAll(async () => {
  bundle = await outerWorkerBundle(
    'worker/chat/integration/journey-entry.test-support.ts',
  )
})
afterEach(async () => {
  await closeSockets(...sockets)
  sockets.length = 0
  await fixture?.dispose()
  fixture = undefined
})

it('retries the same failed workspace with a fresh token and dispatches every stored message once in order', async () => {
  const directory = '.context/boat-native-remote-workspaces/8o/worker'
  await mkdir(directory, { recursive: true })
  const transfer = firstStartAttachmentTransfer()
  const active = (fixture = await createOuterRuntime(bundle, {
    persistencePath: await mkdtemp(`${directory}/retry-runtime-`),
  }))
  transfer.connect(active)
  const saveSetup = async (script: string, value: string) => {
    const ciphertext = await encrypt(
      JSON.stringify({ RETRY_SETUP: value }),
      orgEnvironmentContext(OUTER_ORG),
      active.env.BOAT_KEY_ENCRYPTION_KEY,
    )
    await active.env.DB.prepare(
      'UPDATE settings SET startup_script = ?, env_vars_ciphertext = ? WHERE org_id = ?',
    )
      .bind(script, ciphertext, OUTER_ORG)
      .run()
  }
  await saveSetup('echo initial-startup', 'initial-value')
  const attachment = await uploadFirstStartFile(active, 'kept-first')
  const input = {
    repositoryId: OUTER_REPOSITORY,
    firstMessage: {
      id: 'kept-first',
      text: 'First task',
      choice: CLAUDE,
      attachmentIds: [attachment.id],
    },
  }
  const create = () =>
    active.request(workspacesPath(OUTER_ORG), {
      method: 'POST',
      headers: { Cookie: active.cookies.memberCookie },
      body: JSON.stringify(input),
    })
  const response = await create()
  expect(response.status).toBe(201)
  const created = readCreated(await response.json())
  expect(created.firstMessage).toMatchObject({
    id: 'kept-first',
    text: 'First task',
    attachments: [attachment],
    choice: CLAUDE,
  })
  const id = created.workspace.id
  let bindings = await active.runtime.getBindings<{
    WORKSPACES: DurableObjectNamespace<Workspace>
  }>()
  const actor = () => bindings.WORKSPACES.getByName(id)
  const oldToken = await readWorkspaceToken(active.env, id)
  const send = (messageId: string) =>
    active.request(sessionPaths.messages(OUTER_ORG, id, created.sessionId), {
      method: 'POST',
      body: JSON.stringify({
        ...input.firstMessage,
        attachmentIds: [],
        id: messageId,
        text: messageId,
      }),
    })
  expect((await send('queued-before-failure')).status).toBe(202)
  active.boat.commandExitCode = 1
  expect(
    await driveWorkspaceStart<WorkspaceStartResult<unknown>>(
      actor(),
      actor().waitCreationLifecycle(),
    ),
  ).toMatchObject({
    ok: false,
    error: { code: 'workspace_start_failed' },
  })
  expect(
    await expireAndReadFirstStartFile(active, id, attachment.id),
  ).toMatchObject({
    claim: {
      state: 'claimed',
      claimedWorkspaceId: id,
      claimedMessageId: 'kept-first',
    },
    bytes: FIRST_START_FILE_BYTES,
  })
  expect((await send('queued-after-failure')).status).toBe(202)
  const before = await readChatHistoryPages(
    active.request,
    OUTER_ORG,
    id,
    created.sessionId,
  )
  await active.restart()
  bindings = await active.runtime.getBindings<{
    WORKSPACES: DurableObjectNamespace<Workspace>
  }>()
  for (const cookie of [
    active.cookies.ownerCookie,
    active.cookies.memberCookie,
  ]) {
    const read = await active.request(workspacePath(OUTER_ORG, id), {
      headers: { Cookie: cookie },
    })
    expect(read.status).toBe(200)
    expect(await read.json()).toMatchObject({
      workspace: { id, state: 'error', branch: created.workspace.branch },
      error: { code: 'workspace_start_failed' },
    })
  }
  expect(
    (
      await readChatHistoryPages(
        active.request,
        OUTER_ORG,
        id,
        created.sessionId,
      )
    ).events,
  ).toEqual(before.events)
  const duplicate = await create()
  expect(duplicate.status).toBe(201)
  expect(readCreated(await duplicate.json()).firstMessage).toEqual(
    created.firstMessage,
  )
  expect(active.boat.starts).toHaveLength(1)
  expect((await requestRunner(active, oldToken)).status).toBe(401)

  await seedPublishedImage(active.env.DB, {
    orgId: OUTER_ORG,
    buildId: 'repaired-image-build',
    imageName: 'repaired-image',
    runnerProtocolVersion: 1,
    repositories: [
      {
        id: OUTER_REPOSITORY,
        orgId: OUTER_ORG,
        fullName: 'owner/repository',
        defaultBranch: 'main',
      },
    ],
    software: OUTER_SOFTWARE,
    locations: REPAIRED_REPOSITORY_LOCATIONS,
    now: Date.now(),
  })
  await saveSetup('echo repaired-startup', 'repaired-value')
  const previousCommands = active.boat.commandRequests.length
  active.boat.commandExitCode = 0
  const retry = () =>
    active.request(workspacePaths.resume(OUTER_ORG, id), {
      method: 'POST',
      body: '{}',
    })
  const replies = await Promise.all([retry(), retry()])
  for (const reply of replies) {
    expect(reply.status).toBe(200)
    expect(await reply.json()).toMatchObject({
      workspace: { id, state: 'starting' },
      start: { kind: 'create' },
    })
  }
  await prepareWorkspaceStart(actor())
  expect(active.boat.starts).toHaveLength(2)
  expect(active.boat.starts[1]).toMatchObject({ from: 'repaired-image' })
  expect(active.boat.starts[1]).toMatchObject({
    env: { RETRY_SETUP: 'repaired-value' },
  })
  const replacementCommands = active.boat.commandRequests
    .slice(previousCommands)
    .map(({ command }) => lifecycleCommandBody(command))
    .join('\n')
  expect(replacementCommands).toContain(btoa('echo repaired-startup'))
  expect(replacementCommands).not.toContain(btoa('echo initial-startup'))
  expect(active.boat.deletedIds).toHaveLength(1)
  const token = await readWorkspaceToken(active.env, id)
  expect(token).not.toBe(oldToken)
  const runner = await connectShellRunner(active, id, token, 'kept-retry')
  sockets.push(runner.socket)
  expect(await runner.inbox.next()).toMatchObject({ type: 'welcome' })
  runner.emit({ type: 'runner.ready' })
  expect(await runner.inbox.next()).toMatchObject({
    type: 'confirm',
    throughEventNumber: 1,
  })
  expect(
    await driveWorkspaceStart<WorkspaceStartResult<unknown>>(
      actor(),
      actor().waitCreationLifecycle(),
    ),
  ).toEqual({ ok: true })
  const commands = [
    record(await runner.inbox.next()),
    record(await runner.inbox.next()),
    record(await runner.inbox.next()),
  ]
  expect(commands).toMatchObject([
    { type: 'turn', message: { id: 'kept-first', sender: { id: 'member' } } },
    {
      type: 'message',
      message: { id: 'queued-before-failure', sender: { id: 'owner' } },
    },
    {
      type: 'message',
      message: { id: 'queued-after-failure', sender: { id: 'owner' } },
    },
  ])
  expect(new Set(commands.map((command) => command.turnId))).toEqual(
    new Set([commands[0].turnId]),
  )
  const after = await readChatHistoryPages(
    active.request,
    OUTER_ORG,
    id,
    created.sessionId,
  )
  expect(
    after.events.filter(
      (envelope) => record(envelope.event).type === 'message.accepted',
    ),
  ).toHaveLength(3)
  const final = readCreated(await (await create()).json())
  expect(final.workspace).toMatchObject({
    id,
    branch: created.workspace.branch,
    repositoryId: OUTER_REPOSITORY,
    createdAt: created.workspace.createdAt,
  })
  expect(final.firstMessage.id).toBe('kept-first')
  expect(final.firstMessage.attachments).toEqual([attachment])
  await expectFirstStartCopies(active, transfer, commands[0], attachment.id)
  expect(
    await expireAndReadFirstStartFile(active, id, attachment.id),
  ).toMatchObject({
    claim: { state: 'claimed', claimedWorkspaceId: id },
    bytes: FIRST_START_FILE_BYTES,
  })
})
