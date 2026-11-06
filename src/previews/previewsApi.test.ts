import { describe, expect, it } from 'vitest'
import { previewPath, previewsPath } from '../shared/previews'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_IDS } from '../test-support/fixtures/core'
import { closePreview, listPreviews, openPreview } from './previewsApi'

const org = FAKE_IDS.org
const id = FAKE_IDS.workspace

function setup() {
  const server = new FakeApiServer()
  const workspace = { orgId: org, workspaceId: id, fetch: server.fetch }
  const lastRequest = () => {
    const request = server.requests.at(-1)
    if (!request) throw new Error('The tool sent no request.')
    return request
  }
  return { server, workspace, lastRequest }
}

const preview = {
  id: 'preview-7',
  port: 4000,
  url: 'https://k7q2m9x4p8w3zr5t.conducting-previews.test/',
  expiresAt: 1_800_086_400_000,
}

describe('previews API', () => {
  it('opens a port with a JSON body and reads the new preview', async () => {
    const { server, workspace, lastRequest } = setup()
    server.json('POST', previewsPath(org, id), { preview }, 201)

    const result = await openPreview(workspace, 4000)

    const request = lastRequest()
    expect(request.method).toBe('POST')
    expect(new URL(request.url).pathname).toBe(previewsPath(org, id))
    expect(request.headers.get('Content-Type')).toBe('application/json')
    expect(await request.text()).toBe('{"port":4000}')
    expect(result).toEqual({ ok: true, value: preview })
  })

  it('closes a preview with an empty JSON object', async () => {
    const { workspace, lastRequest } = setup()

    const result = await closePreview(workspace, FAKE_IDS.preview)

    const request = lastRequest()
    expect(request.method).toBe('DELETE')
    expect(new URL(request.url).pathname).toBe(
      previewPath(org, id, FAKE_IDS.preview),
    )
    expect(request.headers.get('Content-Type')).toBe('application/json')
    expect(await request.text()).toBe('{}')
    expect(result).toEqual({ ok: true, value: true })
  })

  it('keeps the message of a refused open for the form', async () => {
    const { server, workspace } = setup()
    const error = { code: 'port_closed', message: 'Nothing listens on 4000.' }
    server.json('POST', previewsPath(org, id), { error }, 409)

    const result = await openPreview(workspace, 4000)

    expect(result).toEqual({ ok: false, error })
  })

  it.each([
    ['a port that is not a number', { ...preview, port: '4000' }],
    ['an address that is not a web address', { ...preview, url: 'data:,x' }],
  ])('shows an error for a list with %s', async (_case, broken) => {
    const { server, workspace } = setup()
    server.json('GET', previewsPath(org, id), { previews: [preview, broken] })

    const result = await listPreviews(workspace, new AbortController().signal)

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'invalid_response',
        message: 'The request failed. Try again.',
      },
    })
  })
})
