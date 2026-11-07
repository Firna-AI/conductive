import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  previewsPath,
  type PreviewLaunchResponse,
  type PreviewResponse,
} from '../../src/shared/previews'
import { TEST_ORIGIN } from '../test-support/harness'
import { createPreviewHandler } from './handler'
import { handoffRequest, launchForm } from './launch-test-support'
import { openPreview } from './stream-test-support'
import { createToolsHarness, type ToolsHarness } from './test-support'

let harness: ToolsHarness
beforeAll(async () => {
  harness = await createToolsHarness()
})
beforeEach(async () => {
  await harness.resetTools()
})
afterAll(async () => {
  await harness.dispose()
})

type Mode = 'form' | 'header'
type Form = ReturnType<typeof launchForm>

async function launchFields(
  setup: Awaited<ReturnType<typeof openPreview>>,
  mode: Mode,
  launchUrl = setup.preview.url,
): Promise<Form> {
  const page = await setup.handler.fetch(
    setup.request(new URL(launchUrl).pathname, {
      headers: { Accept: mode === 'form' ? 'text/html' : 'application/json' },
    }),
  )
  expect(page.status).toBe(200)
  if (mode === 'form') return launchForm(await page.text())
  const launch: PreviewLaunchResponse = await page.json()
  const url = new URL(launch.url)
  const body = new URLSearchParams(url.hash.slice(1))
  url.hash = ''
  return { action: url.href, body }
}

function redemptionRequest(
  mode: Mode,
  form: Form,
  hostname: string,
  origin: string,
): Request {
  const body = new URLSearchParams(form.body)
  body.set('hostname', hostname)
  if (mode === 'form')
    return handoffRequest({ action: form.action, body }, origin)
  const url = new URL(form.action)
  url.searchParams.set('hostname', hostname)
  return new Request(url, {
    method: 'POST',
    headers: {
      Origin: origin,
      Authorization: `Bearer ${body.get('grant') ?? ''}`,
    },
  })
}

async function expectUnavailable(response: Response): Promise<void> {
  expect(response.status).toBe(404)
  expect(await response.json()).toEqual({
    error: {
      code: 'preview_not_found',
      message: 'The preview is not available.',
    },
  })
  expect(response.headers.getSetCookie()).toEqual([])
}

it.each(['form', 'header'] as const)(
  'redeems a %s grant once across handlers after rejecting wrong Origin and hostname',
  async (mode) => {
    const setup = await openPreview(harness)
    const form = await launchFields(setup, mode)
    const opened = await setup.handler.fetch(
      setup.request(previewsPath(setup.orgId, setup.workspaceId), {
        method: 'POST',
        body: '{"port":3001}',
      }),
    )
    expect(opened.status).toBe(201)
    const { preview }: PreviewResponse = await opened.json()
    const other = await launchFields(setup, mode, preview.url)
    const hostname = form.body.get('hostname') ?? ''
    const origin = mode === 'form' ? TEST_ORIGIN : new URL(form.action).origin
    const restarted = createPreviewHandler(harness.env, harness.dependencies)
    harness.requests.length = 0

    for (const request of [
      redemptionRequest(mode, form, hostname, 'https://foreign.test'),
      redemptionRequest(mode, form, other.body.get('hostname') ?? '', origin),
    ]) {
      await expectUnavailable(await setup.handler.proxy(request))
    }

    const accepted = await restarted.proxy(
      redemptionRequest(mode, form, hostname, origin),
    )
    expect(accepted.status).toBe(mode === 'form' ? 303 : 200)
    expect(accepted.headers.getSetCookie()).toHaveLength(1)
    const destination: Pick<PreviewLaunchResponse, 'url'> =
      mode === 'form'
        ? { url: accepted.headers.get('Location') ?? '' }
        : await accepted.json()
    expect(destination).toEqual({ url: `${setup.previewUrl}/` })

    const replay = await setup.handler.proxy(
      redemptionRequest(mode, form, hostname, origin),
    )
    await expectUnavailable(replay)
    expect(harness.requests).toHaveLength(0)
  },
)
