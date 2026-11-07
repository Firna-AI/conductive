import { afterEach, beforeAll, expect, it } from 'vitest'

import { MACHINE_PATHS } from '../../../src/shared/agent-tools'
import { TOOL_TURN_HEADER } from '../../../tools/context'
import { IMAGE_SOURCE_CREDENTIAL_PATH } from '../../lifecycle/image-sources/credential'
import { saveGitHubTokens } from '../../security/github-tokens'
import {
  OUTER_MACHINE_ORIGIN,
  outerWorkerBundle,
} from './outer-runtime.test-support'
import { OTHER_TOKEN, OUTER_TOKEN } from './outer-seed.test-support'
import { createLifecycleChatFixture } from './workspace-lifecycle.test-support'

let bundle: string
let fixture: Awaited<ReturnType<typeof createLifecycleChatFixture>> | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle()
})
afterEach(async () => {
  await fixture?.dispose()
  fixture = undefined
})

it('keeps machine credential routes behind their own token gates and uses the trusted turn sender', async () => {
  const active = (fixture = await createLifecycleChatFixture(bundle))
  await active.initialize()
  await saveGitHubTokens(
    active.env,
    'owner',
    {
      accessToken: 'owner-github-token',
      expiresAt: null,
      refreshToken: null,
      refreshExpiresAt: null,
    },
    1,
  )
  const request = (path: string, token?: string) =>
    active.runtime.dispatchFetch(`${OUTER_MACHINE_ORIGIN}${path}`, {
      method: 'POST',
      headers: {
        [TOOL_TURN_HEADER]: 'first-turn',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
  const missing = await request(MACHINE_PATHS.gitCredential)
  expect(missing.status).toBe(401)
  expect(await missing.json()).toMatchObject({
    error: { code: 'workspace_token_refused' },
  })
  const foreign = await request(MACHINE_PATHS.gitCredential, OTHER_TOKEN)
  expect(foreign.status).toBe(409)
  expect(await foreign.json()).toMatchObject({
    error: { code: 'current_turn_required' },
  })
  const credential = await request(MACHINE_PATHS.gitCredential, OUTER_TOKEN)
  expect(credential.status).toBe(200)
  expect(credential.headers.get('Cache-Control')).toBe('no-store')
  expect(await credential.json()).toEqual({ token: 'owner-github-token' })
  const noGrant = await request(IMAGE_SOURCE_CREDENTIAL_PATH)
  expect(noGrant.status).toBe(401)
  expect(await noGrant.json()).toMatchObject({
    error: { code: 'build_grant_refused' },
  })
  const workspaceToken = await request(
    IMAGE_SOURCE_CREDENTIAL_PATH,
    OUTER_TOKEN,
  )
  expect(workspaceToken.status).toBe(401)
  expect(await workspaceToken.json()).toMatchObject({
    error: { code: 'build_grant_refused' },
  })
})
