import type { WebSocket } from 'miniflare'
import { expect } from 'vitest'

import type { RunnerHello } from '../../src/shared/generated/RunnerHello'
import type { RunnerSkillResult } from '../../src/shared/generated/RunnerSkillResult'
import { skillContentPath } from '../../src/shared/skills'
import { record, string } from '../chat/inputs'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import {
  OuterFakeRunner,
  requestRunner,
} from '../chat/integration/runner-socket.test-support'
import type { FeatureFixture } from './fixture.test-support'

export const path = skillContentPath(OUTER_ORG, OUTER_WORKSPACE, {
  agent: 'codex',
  name: 'release/check',
})

export async function connectSkillRunner(
  fixture: FeatureFixture,
  sockets: WebSocket[],
  skillReads: RunnerHello['skillReads'],
) {
  const response = await requestRunner(fixture)
  expect(response.status).toBe(101)
  if (!response.webSocket) throw new Error('The runner socket is missing.')
  sockets.push(response.webSocket)
  const runner = new OuterFakeRunner(response.webSocket, OUTER_WORKSPACE, {
    skillReads,
  })
  expect(await runner.inbox.next()).toMatchObject({ type: 'welcome' })
  runner.emit({ type: 'runner.ready' })
  expect(await runner.inbox.next()).toMatchObject({ type: 'confirm' })
  return runner
}

export async function requestSkill(
  fixture: FeatureFixture,
  runner: OuterFakeRunner,
  cookie = fixture.cookies.ownerCookie,
) {
  const response = fixture.request(path, { headers: { Cookie: cookie } })
  const command = record(
    await Promise.race([
      runner.inbox.next(),
      response.then(({ status }) => ({ status })),
    ]),
  )
  expect(command).toEqual({
    type: 'skill.read',
    requestId: expect.any(String),
    agent: 'codex',
    name: 'release/check',
    maxBytes: 1_048_576,
  })
  return {
    response,
    reply(result: RunnerSkillResult['result']) {
      runner.socket.send(
        JSON.stringify({
          type: 'skill.read.result',
          requestId: string(command.requestId),
          result,
        } satisfies RunnerSkillResult),
      )
      return response
    },
  }
}
