import { afterAll, beforeAll, expect, it } from 'vitest'

import {
  contentSecurityPolicy,
  readConfiguration,
} from '../../desktop/src/config'
import { createApp } from '../application'
import { fakeSite } from '../test-support/fake-site'
import { createHarness, type TestHarness } from '../test-support/harness'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
afterAll(async () => {
  await harness.dispose()
})

function policyParts(value: string | null) {
  const directives = (value ?? '').split(';').map((part) => part.trim())
  const frame = (directive: string) => directive.startsWith('frame-src ')
  return {
    other: directives.filter((directive) => !frame(directive)),
    frames: directives
      .filter(frame)
      .map((directive) => directive.split(/\s+/).slice(1)),
  }
}

it('serves app assets and same-origin local modules with the actual desktop policy while preserving host boundaries', async () => {
  const previewDomain = 'conductive-previews.test'
  for (const binding of ['configured', 'missing', 'empty', 'stale'] as const) {
    const requestOrigin =
      binding === 'configured'
        ? harness.env.APP_ORIGIN
        : binding === 'stale'
          ? 'http://127.0.0.1:5174'
          : 'http://127.0.0.1:5173'
    const requests: string[] = []
    const env = {
      ...harness.env,
      APP_ORIGIN:
        binding === 'configured'
          ? harness.env.APP_ORIGIN
          : binding === 'stale'
            ? 'http://127.0.0.1:5173'
            : '',
      MACHINE_ORIGIN: 'https://machines.conductive.test',
      PREVIEW_DOMAIN: previewDomain,
      CONDUCTIVE_FRAME_SOURCES:
        'https://desktop.on.boat.dev http://untrusted.test https://good.test;script-src',
      ASSETS: {
        fetch: async (request: Request) => {
          requests.push(request.url)
          return new Response('<main>Conductive</main>', {
            headers: { 'Content-Type': 'text/html' },
          })
        },
      },
    }
    if (binding === 'missing') Reflect.deleteProperty(env, 'APP_ORIGIN')
    const app = createApp()
    const response = await app.fetch(new Request(`${requestOrigin}/app`), env)
    expect(response.status, binding).toBe(200)
    expect(await response.text(), binding).toBe('<main>Conductive</main>')
    expect(response.headers.get('Content-Type'), binding).toBe('text/html')
    expect(requests, binding).toEqual([`${requestOrigin}/app`])
    const desktopPolicy = contentSecurityPolicy(
      readConfiguration({
        appOrigin: requestOrigin,
        frameSources: [
          `https://*.${previewDomain}`,
          'https://desktop.on.boat.dev',
        ],
      }),
    )
    expect(desktopPolicy, binding).not.toBe('')
    const web = policyParts(response.headers.get('Content-Security-Policy'))
    const desktop = policyParts(desktopPolicy)
    expect(web.other, binding).toEqual(desktop.other)
    expect(web.frames, binding).toEqual([
      ["'self'", `https://*.${previewDomain}`, 'https://desktop.on.boat.dev'],
    ])
    expect(desktop.frames, binding).toEqual([
      [
        "'self'",
        requestOrigin,
        `https://*.${previewDomain}`,
        'https://desktop.on.boat.dev',
      ],
    ])
    for (const path of ['/@vite/client', '/src/main.tsx']) {
      const module = await app.fetch(
        new Request(`${requestOrigin}${path}`, {
          headers: { Origin: requestOrigin },
        }),
        env,
      )
      expect(module.status, `${binding} ${path}`).toBe(200)
    }
    const otherLocalOrigin =
      requestOrigin === 'http://127.0.0.1:5174'
        ? 'http://127.0.0.1:5173'
        : 'http://127.0.0.1:5174'
    for (const origin of [otherLocalOrigin, 'https://untrusted.test']) {
      const refused = await app.fetch(
        new Request(`${requestOrigin}/src/main.tsx`, {
          headers: { Origin: origin },
        }),
        env,
      )
      expect(refused.status, `${binding} ${origin}`).toBe(403)
    }
    expect(requests, binding).toHaveLength(3)
    for (const input of [
      { origin: env.MACHINE_ORIGIN, status: 501 },
      { origin: `https://unknown.${previewDomain}`, status: 404 },
      { origin: 'https://untrusted.test', status: 403 },
    ]) {
      const other = await app.fetch(
        new Request(`${input.origin}/src/main.tsx`, {
          headers: { Origin: input.origin },
        }),
        env,
      )
      expect(other.status, `${binding} ${input.origin}`).toBe(input.status)
    }
    const marketing = await app.fetch(
      new Request('https://conductive.build/'),
      { ...env, APP_ORIGIN: harness.env.APP_ORIGIN, ASSETS: fakeSite() },
    )
    expect(marketing.status, binding).toBe(200)
    expect(await marketing.text(), binding).toContain(
      'Give every coding task its own cloud computer.',
    )
    expect(requests, binding).toHaveLength(3)
  }
})
