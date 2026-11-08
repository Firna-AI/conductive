import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { desktopPath } from '../shared/desktop'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_IDS } from '../test-support/fixtures/core'
import { DesktopFrame } from './DesktopFrame'
import { loadDesktop } from './desktopApi'

const url = 'https://desktop.conductive.test/stream?session=7#token=k7q2m9x4'

describe('desktop', () => {
  it('asks for each desktop address past the browser cache, and opens it with its fragment', async () => {
    const server = new FakeApiServer()
    const path = desktopPath(FAKE_IDS.org, FAKE_IDS.workspace)
    server.json('GET', path, { url, expiresAt: 1_800_000_600_000 })
    const workspace = {
      orgId: FAKE_IDS.org,
      workspaceId: FAKE_IDS.workspace,
      fetch: server.fetch,
    }

    const result = await loadDesktop(workspace, new AbortController().signal)
    await loadDesktop(workspace, new AbortController().signal)

    expect(
      server.requests.map((request) => [request.method, request.cache]),
    ).toEqual([
      ['GET', 'no-store'],
      ['GET', 'no-store'],
    ])
    expect(result).toEqual({
      ok: true,
      value: { url, expiresAt: 1_800_000_600_000 },
    })
    const html = renderToStaticMarkup(
      <DesktopFrame
        desktop={{ url, expiresAt: 1_800_000_600_000 }}
        onLoad={() => undefined}
      />,
    )
    expect(html).toContain(`src="${url}"`)
    expect(html).toMatch(/referrerpolicy="no-referrer"/i)
  })
})
