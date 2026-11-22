import { afterEach, beforeAll, beforeEach, expect, it } from 'vitest'

import { agentSessionPaths } from '../../src/shared/agent-session-paths'
import { record, string } from '../chat/inputs'
import {
  OTHER_WORKSPACE,
  OTHER_TOKEN,
} from '../chat/integration/outer-seed.test-support'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  agentWriteFixture,
  type AgentWriteFixture,
} from './agent-session-writes.test-support'

let bundle: string
let fixture: AgentWriteFixture | undefined
let active: AgentWriteFixture
let runner: Awaited<ReturnType<AgentWriteFixture['connect']>>
let first: Awaited<ReturnType<typeof watchTarget>>
let second: Awaited<ReturnType<typeof watchTarget>>
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})
beforeEach(async () => {
  active = fixture = await agentWriteFixture(bundle)
})
beforeEach(async () => {
  runner = await active.connect(OTHER_WORKSPACE, OTHER_TOKEN)
})
beforeEach(async () => {
  first = await watchTarget(active, runner, 'owner')
})
beforeEach(async () => {
  second = await watchTarget(active, runner, 'member')
})
afterEach(async () => {
  await fixture?.dispose()
  fixture = undefined
})

async function watchTarget(
  active: AgentWriteFixture,
  runner: Awaited<ReturnType<AgentWriteFixture['connect']>>,
  user: 'owner' | 'member',
) {
  const cookie =
    user === 'owner' ? active.cookies.ownerCookie : active.cookies.memberCookie
  const sessionId = await active.createSession(OTHER_WORKSPACE, cookie)
  const turnId = await active.start(
    OTHER_WORKSPACE,
    sessionId,
    runner,
    user,
    cookie,
  )
  const response = await active.post(
    agentSessionPaths.watch(OTHER_WORKSPACE, sessionId),
    { turnId },
  )
  expect(response.status).toBe(200)
  return {
    sessionId,
    turnId,
    watchId: string(record(await response.json()).watchId),
    messageId: `${user}-starting-message`,
  }
}

it('keeps a new committed end due while an older delivery reply is held', async () => {
  const caller = await active.actor()
  const target = await active.actor(OTHER_WORKSPACE)
  await caller.holdSessionWatchReply(first.watchId)
  const finish = async (turn: typeof first) => {
    runner.emit({
      type: 'turn.completed',
      sessionId: turn.sessionId,
      turnId: turn.turnId,
      state: 'finished',
      durationMs: 1,
      files: [],
      omittedFileCount: 0,
      userMessageIds: [turn.messageId],
    })
    await runner.inbox.next()
  }
  await finish(first)
  const draining = target.advanceStartAlarm()
  try {
    await caller.waitForSessionWatchReply()
    expect(await caller.sessionWatchReceipt(first.watchId)).toMatchObject({
      state: 'accepted',
    })
    await finish(second)
    expect(await caller.sessionWatchReceipt(second.watchId)).toBe(undefined)
  } finally {
    await caller.releaseSessionWatchReply()
    await draining
  }
  expect(await caller.sessionWatchReceipt(second.watchId)).toMatchObject({
    state: 'accepted',
  })
})
