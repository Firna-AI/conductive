import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { API_PATHS } from '../../src/shared/api'
import { userSuspensionPath } from '../../src/shared/operator'
import { TEST_ORIGIN } from '../test-support/harness'
import {
  handoffRequest,
  launchForm,
  launchPreview,
} from './launch-test-support'
import { bodySource, openPreview } from './stream-test-support'
import { relayResponse } from './relay.test-support'
import { activeMember } from './suspension-test-support'
import { createToolsHarness, type ToolsHarness } from './test-support'

let harness: ToolsHarness
beforeAll(async () => {
  harness = await createToolsHarness()
})
beforeEach(async () => {
  await harness.resetTools()
  delete harness.env.OPERATOR_GITHUB_IDS
})
afterAll(async () => {
  await harness.dispose()
})

it.each([
  { change: 'suspended', expectedStatus: 200 },
  { change: 'removed', expectedStatus: 204 },
  { change: 'signed out', expectedStatus: 204 },
] as const)(
  'denies a viewer who is $change without closing another viewer of the same preview',
  async ({ change, expectedStatus }) => {
    const setup = await openPreview(harness)
    const viewer = await activeMember(harness, setup.orgId)
    const browser = await launchPreview(
      setup.handler,
      viewer.request,
      setup.preview.url,
    )
    const launch = await setup.handler.fetch(
      viewer.request(new URL(setup.preview.url).pathname),
    )
    const unused = launchForm(await launch.text())
    const deniedSource = bodySource()
    const allowedSource = bodySource()
    const sources = [deniedSource, allowedSource]
    const base = harness.dependencies.fetch
    harness.dependencies.fetch = async (request) =>
      new URL(request.url).hostname === 'boat.dev'
        ? base(request)
        : relayResponse(sources.shift()?.stream ?? 'still available')
    const denied = await setup.handler.proxy(browser.request())
    const allowed = await setup.handler.proxy(setup.previewRequest())
    const deniedReader = denied.body?.getReader()
    const allowedReader = allowed.body?.getReader()
    if (!deniedReader || !allowedReader) throw new Error('Missing preview body')
    const initial = deniedReader.read()
    deniedSource.send('before access changes')
    expect(new TextDecoder().decode((await initial).value)).toBe(
      'before access changes',
    )
    let status = 204
    if (change === 'suspended') {
      harness.env.OPERATOR_GITHUB_IDS = '7'
      const result = await harness.request(
        userSuspensionPath(viewer.user.githubId),
        setup.session,
        { method: 'POST', body: '{}' },
      )
      status = result.status
    } else if (change === 'removed') {
      await harness.env.DB.prepare(
        'DELETE FROM org_members WHERE org_id = ? AND user_id = ?',
      )
        .bind(setup.orgId, viewer.user.id)
        .run()
    } else {
      const result = await harness.request(API_PATHS.signOut, viewer.session, {
        method: 'POST',
        body: '{}',
      })
      status = result.status
    }
    expect(status).toBe(expectedStatus)
    harness.requests.length = 0
    expect(
      (await setup.handler.proxy(handoffRequest(unused, TEST_ORIGIN))).status,
    ).toBe(404)
    expect((await setup.handler.proxy(browser.request())).status).toBe(404)
    expect(harness.requests).toHaveLength(0)
    const nextDenied = deniedReader.read()
    deniedSource.send('must stay private')
    await expect(nextDenied).rejects.toMatchObject({ name: 'AbortError' })
    expect(deniedSource.cancelled).toBe(true)
    const nextAllowed = allowedReader.read()
    allowedSource.send('other viewer keeps access')
    expect(new TextDecoder().decode((await nextAllowed).value)).toBe(
      'other viewer keeps access',
    )
    expect(allowedSource.cancelled).toBe(false)
    await allowedReader.cancel()
    const again = await setup.handler.proxy(setup.previewRequest())
    expect(await again.text()).toBe('still available')
  },
)
