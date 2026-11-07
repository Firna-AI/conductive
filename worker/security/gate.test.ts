import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import { API_PATHS, boatKeyPath, orgPath } from '../../src/shared/api'
import { createApp } from '../application'
import {
  createHarness,
  TEST_ORIGIN,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { checkOrigin } from './gate'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

it('checks sign-in before known routes, unknown routes, and socket upgrades', async () => {
  for (const path of [API_PATHS.session, '/api/unknown', '/api/chat']) {
    const response = await harness.fetch(path, {
      headers: { Origin: TEST_ORIGIN, Upgrade: 'websocket' },
    })
    expect(response.status, path).toBe(401)
    expect(await response.json()).toMatchObject({
      error: { code: 'sign_in_required' },
    })
  }
})

it('refuses tampered, expired, and unknown signed sessions', async () => {
  const session = await harness.login()
  const tampered = session.replace('session=', 'session=x')
  expect((await harness.request(API_PATHS.session, tampered)).status).toBe(401)
  harness.setTime(TEST_TIME + 8 * 24 * 60 * 60 * 1000)
  expect((await harness.request(API_PATHS.session, session)).status).toBe(401)
  harness.setTime(TEST_TIME)
  await harness.env.DB.prepare('DELETE FROM sessions').run()
  expect((await harness.request(API_PATHS.session, session)).status).toBe(401)
})

it('allows an absent Origin only for GET and HEAD reads', () => {
  for (const method of ['GET', 'HEAD']) {
    expect(() =>
      checkOrigin(
        new Request(`${TEST_ORIGIN}/api/unknown`, { method }),
        harness.env,
      ),
    ).not.toThrow()
  }
  for (const input of [
    { method: 'GET', origin: 'https://untrusted-preview.test' },
    { method: 'HEAD', origin: 'null' },
    { method: 'POST' },
    { method: 'OPTIONS' },
    { method: 'GET', upgrade: 'websocket' },
    { method: 'HEAD', upgrade: 'WebSocket' },
    { method: 'GET', upgrade: 'h2c' },
  ]) {
    const headers = new Headers()
    if (input.origin) headers.set('Origin', input.origin)
    if (input.upgrade) headers.set('Upgrade', input.upgrade)
    expect(() =>
      checkOrigin(
        new Request(`${TEST_ORIGIN}/api/unknown`, {
          method: input.method,
          headers,
        }),
        harness.env,
      ),
    ).toThrow('Open the app to continue.')
    headers.set('Origin', TEST_ORIGIN)
    expect(() =>
      checkOrigin(
        new Request(`${TEST_ORIGIN}/api/unknown`, {
          method: input.method,
          headers,
        }),
        harness.env,
      ),
    ).not.toThrow()
  }
})

it('requires a matching Origin for socket upgrades before dispatch', async () => {
  const session = await harness.login()
  for (const origin of [null, 'null', 'https://untrusted-preview.test']) {
    for (const method of ['GET', 'POST']) {
      const headers = new Headers({ Cookie: session, Upgrade: 'websocket' })
      if (origin !== null) headers.set('Origin', origin)
      const response = await harness.fetch(API_PATHS.orgs, { method, headers })
      expect(response.status, `${method} ${origin}`).toBe(403)
      expect(await response.json()).toMatchObject({
        error: { code: 'origin_forbidden' },
      })
    }
  }
  expect(
    await harness.env.DB.prepare('SELECT COUNT(*) AS count FROM orgs').first(
      'count',
    ),
  ).toBe(0)
})

it('routes site, app, and machine hosts before dispatch', async () => {
  const app = createApp()
  const env = {
    ...harness.env,
    MARKETING_ORIGIN: 'https://conductive.test',
    MACHINE_ORIGIN: 'https://api.conductive.build',
    PREVIEW_DOMAIN: 'conductive.page',
  }
  const site = await app.fetch(
    new Request('https://conductive.test/api/session'),
    env,
  )
  expect(site.status).toBe(404)
  expect(site.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
  for (const input of [
    {
      host: TEST_ORIGIN,
      path: '/',
      status: 501,
      body: { surface: 'app', status: 'not-implemented' },
    },
    {
      host: env.MACHINE_ORIGIN,
      path: MACHINE_PATHS.runner,
      status: 401,
      body: {
        error: {
          code: 'workspace_token_required',
          message: 'The connection is not available.',
        },
      },
    },
  ]) {
    const response = await app.fetch(
      new Request(`${input.host}${input.path}`),
      env,
    )
    expect(response.status, input.host).toBe(input.status)
    expect(await response.json()).toEqual(input.body)
  }
  const unknown = await app.fetch(
    new Request('https://untrusted.test/api/session'),
    env,
  )
  expect(unknown.status).toBe(403)
  const preview = await app.fetch(
    new Request(`https://unknown.${env.PREVIEW_DOMAIN}/`),
    env,
  )
  expect(preview.status).toBe(404)
  expect((await harness.fetch(API_PATHS.session)).status).toBe(401)
  const session = await harness.login()
  const response = await harness.fetch(API_PATHS.session, {
    headers: { Cookie: session },
  })
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({
    user: { githubLogin: 'octocat' },
  })
})

it('accepts only a JSON object for writes before route dispatch', async () => {
  const session = await harness.login()
  for (const input of [
    { type: 'text/plain', body: '{}', status: 415 },
    { type: 'application/json', body: '{', status: 400 },
    { type: 'application/json', body: '[]', status: 400 },
  ]) {
    const response = await harness.fetch('/api/unknown', {
      method: 'POST',
      headers: {
        Cookie: session,
        Origin: TEST_ORIGIN,
        'Content-Type': input.type,
      },
      body: input.body,
    })
    expect(response.status, input.body).toBe(input.status)
  }
  const valid = await harness.fetch(API_PATHS.orgs, {
    method: 'POST',
    headers: {
      Cookie: session,
      Origin: TEST_ORIGIN,
      'Content-Type': ' Application/JSON ; charset=UTF-8 ',
    },
    body: '{"name":"Team"}',
  })
  expect(valid.status).toBe(201)
})

it('creates the org and admin together and lists only the user’s orgs', async () => {
  const first = await harness.login()
  const org = await harness.createOrg(first, 'Team')
  expect(org).toMatchObject({ name: 'Team', role: 'admin' })
  expect(await (await harness.request(orgPath(org.id), first)).json()).toEqual({
    org,
  })
  expect(
    await harness.env.DB.prepare(
      'SELECT role FROM org_members WHERE org_id = ?',
    )
      .bind(org.id)
      .first('role'),
  ).toBe('admin')
  expect(
    await harness.env.DB.prepare('SELECT org_id FROM settings WHERE org_id = ?')
      .bind(org.id)
      .first('org_id'),
  ).toBe(org.id)
  harness.github.profile = { id: 8, login: 'other-user' }
  const other = await harness.login()
  expect(await (await harness.request(API_PATHS.orgs, other)).json()).toEqual({
    orgs: [],
  })
  for (const path of [
    orgPath(org.id),
    boatKeyPath(org.id),
    `${orgPath(org.id)}/unknown`,
  ]) {
    expect((await harness.request(path, other)).status, path).toBe(404)
  }
  expect(
    (
      await harness.request(boatKeyPath(org.id), other, {
        method: 'PUT',
        body: '{"key":"boat-first"}',
      })
    ).status,
  ).toBe(404)
  expect(harness.boat.requests).toHaveLength(0)
})
