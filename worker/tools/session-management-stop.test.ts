import { afterEach, beforeAll, expect, it } from 'vitest'

import {
  agentSessionPaths,
  agentSessionTranscriptPath,
} from '../../src/shared/agent-session-paths'
import { sessionPaths } from '../../src/shared/sessions'
import { sessionLink } from '../../src/shared/session-link'
import {
  OTHER_WORKSPACE,
  OTHER_TOKEN,
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import { record } from '../chat/inputs'
import { chatKey } from '../chat/storage-keys'
import {
  agentWriteFixture,
  type AgentWriteFixture,
} from '../features/agent-session-writes.test-support'
import { featureState } from '../features/fixture.test-support'
import { machineRead } from './session-management.test-support'

let bundle: string
let fixture: AgentWriteFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})
afterEach(async () => {
  await fixture?.dispose()
})

it('keeps the first tool stopper across restart and transcript copy and can stop its own session', async () => {
  const active = (fixture = await agentWriteFixture(bundle))
  const id = await active.createSession(OTHER_WORKSPACE)
  const runner = await active.connect(OTHER_WORKSPACE, OTHER_TOKEN)
  const turnId = await active.start(
    OTHER_WORKSPACE,
    id,
    runner,
    'owner',
    active.cookies.ownerCookie,
  )
  const response = await active.post(
    agentSessionPaths.stop(OTHER_WORKSPACE, id),
    {
      requestedById: 'owner',
      callerWorkspaceId: 'forged',
      callerSessionId: 'forged',
    },
  )
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({ turnId, state: 'stopping' })
  expect(await runner.inbox.next()).toMatchObject({ type: 'interrupt', turnId })
  const requestedBySession = {
    workspaceId: OUTER_WORKSPACE,
    sessionId: active.sourceSessionId,
  }
  const before = featureState(
    await (await active.actor(OTHER_WORKSPACE)).inspectFeatureState(),
  )
  expect(record(before.get(chatKey('turn', turnId))).stopRequest).toEqual({
    requestedBySession,
  })
  const second = await active.request(
    sessionPaths.interrupt(OUTER_ORG, OTHER_WORKSPACE, id),
    { method: 'POST', body: JSON.stringify({ turnId }) },
  )
  expect(second.status).toBe(200)
  expect(
    record(
      featureState(
        await (await active.actor(OTHER_WORKSPACE)).inspectFeatureState(),
      ).get(chatKey('turn', turnId)),
    ).stopRequest,
  ).toEqual({ requestedBySession })
  runner.emit({
    type: 'turn.completed',
    sessionId: id,
    turnId,
    state: 'stopped',
    durationMs: 1,
    files: [],
    omittedFileCount: 0,
    userMessageIds: ['owner-starting-message'],
  })
  await runner.inbox.next()
  await active.restart()
  const transcriptResponse = await machineRead(
    active,
    agentSessionTranscriptPath(OTHER_WORKSPACE, id),
  )
  expect(transcriptResponse.status).toBe(200)
  const transcript = record(await transcriptResponse.json())
  expect(transcript.markdown).toContain(
    `_Stopped from <${sessionLink(active.env.APP_ORIGIN, OUTER_ORG, OUTER_WORKSPACE, active.sourceSessionId)}>_`,
  )
  expect(transcript.markdown).not.toContain('member stopped the agent')
  const idle = await active.post(
    agentSessionPaths.stop(OTHER_WORKSPACE, id),
    {},
  )
  expect(idle.status).toBe(200)
  expect(await idle.json()).toMatchObject({ turnId: null, state: 'idle' })
  expect(
    record(
      featureState(
        await (await active.actor(OTHER_WORKSPACE)).inspectFeatureState(),
      ).get(chatKey('turn', turnId)),
    ).stopRequest,
  ).toEqual({ requestedBySession })
  const self = await active.post(
    agentSessionPaths.stop(undefined, active.sourceSessionId),
    {},
  )
  expect(self.status).toBe(200)
  expect(await self.json()).toMatchObject({
    turnId: active.sourceTurnId,
    state: 'stopping',
  })
  const own = featureState(await (await active.actor()).inspectFeatureState())
  expect(
    record(own.get(chatKey('turn', active.sourceTurnId))).stopRequest,
  ).toEqual({ requestedBySession })
  expect(active.boat.starts).toHaveLength(0)
})
