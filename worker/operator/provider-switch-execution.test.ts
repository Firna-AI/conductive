import { expect, it } from 'vitest'

import {
  operatorOrgSwitchPath,
  type OperatorOrgSwitchResponse,
} from '../../src/shared/operator-switch'
import {
  orgSettingsPaths,
  type BuildResponse,
} from '../../src/shared/org-settings'
import { createApp } from '../application'
import { TEST_ORIGIN } from '../test-support/harness'
import { readBuildJob, runningBuild } from '../lifecycle/build-data'
import {
  setupSwitchTests,
  SECONDARY_IMAGE_ACCOUNT,
} from '../lifecycle/provider-switch.test-support'

const fixtureForTest = setupSwitchTests()

it('starts the switch through its operator route and releases a member build when the operator stops it', async () => {
  const fixture = await fixtureForTest()
  const { env, dependencies } = fixture.runtime
  env.OPERATOR_GITHUB_IDS = '7'
  const app = createApp(dependencies)
  const request = (path: string, method: string, body: unknown = {}) =>
    app.fetch(
      new Request(TEST_ORIGIN + path, {
        method,
        headers: {
          Cookie: fixture.session,
          Origin: TEST_ORIGIN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }),
      env,
    )
  const path = operatorOrgSwitchPath(fixture.org.id)
  const response = await request(path, 'POST', {
    providerAccount: SECONDARY_IMAGE_ACCOUNT,
  })
  expect(response.status).toBe(200)
  const started: OperatorOrgSwitchResponse = await response.json()
  expect(started.switch).toMatchObject({
    state: 'building',
    toAccount: SECONDARY_IMAGE_ACCOUNT,
  })
  const hidden = started.switch?.buildId ?? ''
  const memberResponse = await request(
    orgSettingsPaths.builds(fixture.org.id),
    'POST',
  )
  expect(memberResponse.status).toBe(202)
  const member: BuildResponse = await memberResponse.json()
  expect(member.build).toMatchObject({ kind: 'build', state: 'running' })
  expect(member.build.id).not.toBe(hidden)
  expect(member.log[0]?.text).toBe(
    'Waiting for another update of the cloud computer to finish\n',
  )
  const stopped = await request(path, 'DELETE')
  expect(stopped.status).toBe(200)
  expect(await stopped.json()).toMatchObject({ switch: { state: 'stopped' } })
  expect((await readBuildJob(env.DB, fixture.org.id, hidden)).state).toBe(
    'failed',
  )
  expect(
    await readBuildJob(env.DB, fixture.org.id, member.build.id),
  ).toMatchObject({
    waitingForSwitchId: null,
    providerAccount: 'boat',
  })
  expect(await runningBuild(env.DB, fixture.org.id)).toBe(member.build.id)
})
