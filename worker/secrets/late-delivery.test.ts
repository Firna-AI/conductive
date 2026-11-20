import { afterEach, beforeAll, expect, it } from 'vitest'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OuterFakeRunner,
  requestRunner,
} from '../chat/integration/runner-socket.test-support'
import { advanceNextWorkspaceAlarm } from '../chat/integration/workspace-start.test-support'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { closeSockets } from '../chat/adapter-sockets.test-support'
import { readWorkspace } from '../lifecycle/workspace-data'
import { providerForAccount } from '../sandbox/client'
import { secretFixture, type SecretFixture } from './requests.test-support'

let bundle: string
let f: SecretFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle(
    'worker/secrets/requests-entry.test-support.ts',
  )
})
afterEach(async () => {
  await f?.dispose()
  f = undefined
})

it('resumes a stopped computer for a late value answer and dispatches its turn as the original sender', async () => {
  const active = (f = await secretFixture(bundle))
  const pending = await active.waiting({ names: ['TOKEN'], command: 'deploy' })
  await active.finish()
  const actor = await active.secretActor()
  const workspace = await readWorkspace(
    active.env.DB,
    OUTER_ORG,
    OUTER_WORKSPACE,
  )
  if (!workspace.sandboxId) throw new Error('The cloud computer is missing.')
  await providerForAccount(
    active.env,
    active.boat.fetch,
    workspace.providerAccount,
  ).stop(workspace.sandboxId)
  await closeSockets(active.runner.socket)
  await actor.lifecycleStopped()
  await active.runner.closed
  await active.listRequests()
  expect(await (await pending.response).json()).toMatchObject({
    status: 'pending',
  })
  expect(await actor.readLifecycle()).toMatchObject({
    state: 'stopped',
    runnerConnected: false,
  })
  expect(active.boat.stopIds).toEqual(['bx_lifecycle'])

  const answered = await active.answer(pending.request.id, {
    kind: 'values',
    lifetime: 'workspace',
    values: { TOKEN: 'late-workspace-value' },
  })
  expect(answered.request.notice).toMatchObject({ state: 'sent' })
  if (answered.request.notice?.state !== 'sent')
    throw new Error('The late answer notice was not sent.')
  expect(await actor.readLifecycle()).toMatchObject({
    state: 'starting',
    start: { kind: 'resume' },
  })
  while (active.boat.resumeIds.length === 0)
    await advanceNextWorkspaceAlarm(actor)
  await actor.lifecyclePrepared()
  expect(active.boat.resumeIds).toEqual(['bx_lifecycle'])
  const connected = await requestRunner(active)
  expect(connected.status).toBe(101)
  const socket = connected.webSocket
  if (!socket) throw new Error('The resumed runner socket is missing.')
  try {
    const runner = new OuterFakeRunner(socket, undefined, {
      streamId: 'late-answer-resume',
    })
    expect(await runner.inbox.next()).toMatchObject({ type: 'welcome' })
    runner.emit({ type: 'runner.ready' })
    expect(await runner.inbox.next()).toMatchObject({ type: 'confirm' })
    await runner.waitForTurn(answered.request.notice.turnId)
    expect(await runner.inbox.next()).toMatchObject({
      type: 'turn',
      sessionId: 'first-session',
      message: {
        text: 'member gave TOKEN for this workspace.',
        sender: { id: 'owner' },
      },
    })
  } finally {
    await closeSockets(socket)
  }
})

it('dispatches a recovered late notice to the connected runner', async () => {
  const active = (f = await secretFixture(bundle))
  await active.seed('TOKEN', 'recovered-value')
  const pending = await active.waiting({ names: ['TOKEN'], command: 'deploy' })
  await active.finish()
  await active.listRequests()
  expect(await (await pending.response).json()).toMatchObject({
    status: 'pending',
  })
  const actor = await active.secretActor()
  await actor.saveLateAnswerBeforeNotice(pending.request.id, {
    id: 'member',
    githubLogin: 'member',
    displayName: null,
    avatarUrl: null,
  })
  const recovered = (await active.listRequests()).requests[0]
  expect(recovered.notice).toMatchObject({ state: 'sent' })
  if (recovered.notice?.state !== 'sent')
    throw new Error('The recovered notice was not sent.')
  await active.runner.waitForTurn(recovered.notice.turnId)
  expect(active.runner.received).toContainEqual(
    expect.objectContaining({
      type: 'turn',
      sessionId: 'first-session',
      message: expect.objectContaining({
        text: 'member allowed TOKEN for this session.',
        sender: expect.objectContaining({ id: 'owner' }),
      }),
    }),
  )
})
