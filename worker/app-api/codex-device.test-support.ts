import { ACCOUNT_PATHS, codexDevicePath } from '../../src/shared/account'
import { readAccount } from '../../src/app/api/read-core'
import { errorResponse, isRecord } from '../http'
import { gate } from '../security/gate'
import {
  TEST_TIME,
  TEST_ORIGIN,
  type TestHarness,
} from '../test-support/harness'
import { codexDeviceRoute } from './codex-device'
import type { CodexTaskOwner } from '../codex-auth/tasks'
import { fakeCodexTasks } from '../codex-auth/tasks.test-support'

export function jwt(claims: Record<string, unknown>): string {
  return `e30.${btoa(JSON.stringify(claims)).replaceAll('=', '').replaceAll('+', '-').replaceAll('/', '_')}.signature`
}

export function oauthTokens(access = 'first', expiry = TEST_TIME + 3_600_000) {
  return {
    access_token: jwt({ exp: expiry / 1000, marker: access }),
    refresh_token: `refresh-${access}`,
    id_token: jwt({
      email: 'owner@example.test',
      'https://api.openai.com/auth': {
        chatgpt_account_id: 'chatgpt-account',
        chatgpt_plan_type: 'plus',
        chatgpt_user_id: 'chatgpt-user',
      },
    }),
  }
}

export async function deviceFixture(
  harness: TestHarness,
  existingCookie?: string,
  tasks: CodexTaskOwner = fakeCodexTasks().owner,
) {
  const cookie = existingCookie ?? (await harness.login())
  const account = readAccount(
    await (await harness.request(ACCOUNT_PATHS.account, cookie)).json(),
  )
  let now = TEST_TIME
  let sequence = 0
  let currentHandle = 'device-handle-1'
  const calls: Request[] = []
  const answers: Array<Response | (() => Promise<Response>)> = []
  const dependencies = {
    now: () => now,
    randomToken: () =>
      existingCookie === undefined
        ? `device-handle-${++sequence}`
        : harness.reserveTokens(1)[0],
    fetch: async (request: Request) => {
      calls.push(request)
      const response = answers.shift()
      if (!response) throw new Error('No OpenAI reply was set.')
      return typeof response === 'function' ? response() : response
    },
  }
  const request = async (path: string, session = cookie) => {
    const request = new Request(`${TEST_ORIGIN}${path}`, {
      method: 'POST',
      headers: {
        Cookie: session,
        Origin: TEST_ORIGIN,
        'Content-Type': 'application/json',
      },
      body: '{}',
    })
    try {
      const response = await codexDeviceRoute(
        request,
        harness.env,
        await gate(request, harness.env, now),
        dependencies,
        tasks,
      )
      if (!response) throw new Error('The route did not answer.')
      return response
    } catch (error) {
      return errorResponse(error)
    }
  }
  const start = async (interval = '5') => {
    answers.push(
      Response.json({
        device_auth_id: 'private-device',
        user_code: 'ABCD-EFGH',
        interval,
      }),
    )
    const response = await request(ACCOUNT_PATHS.codexDevice)
    if (response.ok) {
      const started: unknown = await response.clone().json()
      if (!isRecord(started) || typeof started.handle !== 'string')
        throw new Error('The device handle is missing.')
      currentHandle = started.handle
    }
    return response
  }
  const approve = () =>
    answers.push(
      Response.json({
        authorization_code: 'private-code',
        code_challenge: 'challenge',
        code_verifier: 'private-verifier',
      }),
      Response.json(oauthTokens()),
    )
  return {
    account,
    cookie,
    calls,
    answers,
    dependencies,
    tasks,
    request,
    start,
    approve,
    poll: (handle = currentHandle, session = cookie) =>
      request(codexDevicePath(handle), session),
    setTime: (value: number) => {
      now = value
    },
  }
}

export async function connectCodexDevice(
  harness: TestHarness,
  cookie: string,
  now = TEST_TIME,
): Promise<Response> {
  const fixture = await deviceFixture(harness, cookie)
  fixture.setTime(now - 5000)
  const start = await fixture.start()
  if (start.status !== 200)
    throw new Error(`Device start failed: ${await start.text()}`)
  fixture.approve()
  fixture.setTime(now)
  const connected = await fixture.poll()
  const result: unknown = await connected.json()
  if (
    typeof result !== 'object' ||
    result === null ||
    !('state' in result) ||
    result.state !== 'connected' ||
    !('login' in result)
  )
    throw new Error('Device sign-in did not connect.')
  return Response.json(result.login)
}
