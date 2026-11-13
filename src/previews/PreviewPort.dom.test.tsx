// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { ToolEvents } from '../shell/workspace/tools/tool-events'
import { previewsPath, type Preview } from '../shared/previews'
import { queryByRole, queryByText } from '../test-support/dom-queries'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../test-support/fixtures/core'
import {
  deferred,
  holdAnimationFrames,
  mount,
  MOUNTED_TEST_TIMEOUT,
  waitFor,
} from '../test-support/mount'
import type { ApiFetch } from '../terminal/tool-parts/request'
import { PreviewTool, type PreviewRoute } from './PreviewTool'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: workspaceId } = FAKE_IDS
const path = previewsPath(org, workspaceId)
const relayError = {
  code: 'preview_relay_unavailable',
  message:
    'Previews need newer cloud computer software. Start a new workspace after an admin runs Build computer.',
}
const openError = `The preview couldn't open. ${relayError.message}`

function preview(port: number): Preview {
  return {
    id: `preview-${port}`,
    port,
    url: `https://p${port}a4826b97d1c04f15802c7e9bb2546d30.conductive-previews.test/`,
    expiresAt: FAKE_TIME + 86_400_000,
  }
}

/** The fake API with these open previews. */
function serverWith(previews: readonly Preview[]): FakeApiServer {
  const server = new FakeApiServer()
  server.json('GET', path, { previews })
  return server
}

/** The bodies of the open requests that reached the server. */
function openBodies(server: FakeApiServer): Promise<unknown[]> {
  const posts = server.requests.filter(({ method }) => method === 'POST')
  return Promise.all(posts.map((post) => post.clone().json()))
}

/** The frame of the preview of a port, or null. */
const frameOf = (port: number) =>
  document.querySelector(`iframe[title="Preview of port ${port}"]`)

/**
 * Mounts the tool at the address of a port. The spies record each move of
 * the address. `moveTo` shows the tool at another address, as the shell
 * does after a move.
 */
async function mountAtPort(fetch: ApiFetch, port: number) {
  const navigate = vi.fn<PreviewRoute['navigate']>()
  const replace = vi.fn<PreviewRoute['replace']>()
  const events = new ToolEvents()
  const tool = (address: Pick<PreviewRoute, 'previewId' | 'port'>) => (
    <PreviewTool
      now={() => FAKE_TIME}
      route={{ ...address, href: (id) => `#${id}`, navigate, replace }}
      touch={false}
      workspace={{
        orgId: org,
        workspaceId,
        fetch,
        subscribe: events.subscribe,
      }}
    />
  )
  const view = await mount(tool({ previewId: null, port }))
  const moveTo = (address: Pick<PreviewRoute, 'previewId' | 'port'>) =>
    view.rerender(tool(address))
  return { navigate, replace, moveTo }
}

describe('the Preview tool at the address of a port', () => {
  it('opens the port once with the request of a typed port, shows the form until the answer, then puts the address of the preview in place', async () => {
    holdAnimationFrames()
    const server = serverWith([preview(3000)])
    server.json('POST', path, { preview: preview(4321) }, 201)
    // The server logs the open at once, and answers after `reply`.
    const reply = deferred()
    const fetch: ApiFetch = async (input, init) => {
      const answer = server.fetch(input, init)
      if (init?.method === 'POST') await reply.promise
      return answer
    }
    const { navigate, replace } = await mountAtPort(fetch, 4321)
    await waitFor(
      () => server.requests.some(({ method }) => method === 'POST'),
      'the open request',
    )

    // The form, not the first tab, shows while the port opens.
    expect(queryByRole('button', 'Open preview')).not.toBeNull()
    expect(frameOf(3000)).toBeNull()
    reply.resolve()
    await waitFor(() => frameOf(4321), 'the new preview')

    expect(await openBodies(server)).toEqual([{ port: 4321 }])
    expect(replace.mock.calls).toEqual([['preview-4321']])
    expect(navigate).not.toHaveBeenCalled()
  })

  it('shows the open preview of the port with no request, and puts its address in place', async () => {
    holdAnimationFrames()
    const server = serverWith([preview(3000), preview(5173)])
    const { navigate, replace } = await mountAtPort(server.fetch, 5173)
    await waitFor(() => frameOf(5173), 'the open preview of the port')

    expect(frameOf(3000)).toBeNull()
    expect(await openBodies(server)).toEqual([])
    expect(replace.mock.calls).toEqual([['preview-5173']])
    expect(navigate).not.toHaveBeenCalled()
  })

  it('shows a failed open in the form, sends no second request, and keeps the form at the address of the tool', async () => {
    holdAnimationFrames()
    const server = serverWith([preview(3000)])
    server.json('POST', path, { error: relayError }, 409)
    // Only the first open answers, so a second one stays in the log and
    // starts no third.
    let opens = 0
    const fetch: ApiFetch = (input, init) => {
      const answer = server.fetch(input, init)
      if (init?.method !== 'POST') return answer
      opens += 1
      return opens === 1 ? answer : new Promise<Response>(() => {})
    }
    const { navigate, replace, moveTo } = await mountAtPort(fetch, 8080)
    await waitFor(() => replace.mock.calls.length > 0, 'the move')

    expect(await openBodies(server)).toEqual([{ port: 8080 }])
    expect(replace.mock.calls).toEqual([[null]])
    expect(navigate).not.toHaveBeenCalled()
    expect(queryByText(openError)).not.toBeNull()

    // The shell moves the address to the tool, with no preview.
    await moveTo({ previewId: null, port: null })
    expect(queryByText(openError)).not.toBeNull()
    expect(frameOf(3000)).toBeNull()
  })
})
