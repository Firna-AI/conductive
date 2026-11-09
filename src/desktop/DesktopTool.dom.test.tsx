// @vitest-environment happy-dom
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { desktopPath } from '../shared/desktop'
import { byRole, byText, queryByText } from '../test-support/dom-queries'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_IDS } from '../test-support/fixtures/core'
import {
  holdAnimationFrames,
  mount,
  MOUNTED_TEST_TIMEOUT,
  waitFor,
} from '../test-support/mount'
import { DesktopTool } from './DesktopTool'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const url = 'https://sandbox-desktop.stream.test/stream.html?app=7#token=k7q2'

/**
 * Sends the event of a browser whose page policy blocked a load from the
 * origin. Chrome sends it to the document, with the origin only. A
 * report-only policy reports the load but does not block it.
 */
async function blockLoadFrom(
  origin: string,
  { directive = 'frame-src', disposition = 'enforce' } = {},
) {
  const event = new Event('securitypolicyviolation', { bubbles: true })
  Object.assign(event, {
    blockedURI: origin,
    effectiveDirective: directive,
    disposition,
  })
  await act(async () => {
    document.dispatchEvent(event)
  })
}

describe('the Desktop tool', () => {
  it('says that the desktop could not open when the page blocks the frame of the stream', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const path = desktopPath(FAKE_IDS.org, FAKE_IDS.workspace)
    server.json('GET', path, { url, expiresAt: 1_800_000_600_000 })
    await mount(
      <DesktopTool
        touch={false}
        workspace={{
          orgId: FAKE_IDS.org,
          workspaceId: FAKE_IDS.workspace,
          fetch: server.fetch,
          subscribe: () => () => undefined,
        }}
      />,
    )
    await waitFor(
      () => document.querySelector('iframe'),
      'the frame of the stream',
    )

    // A block of another origin or of an image, and a report that blocks
    // nothing, leave the stream as it is.
    const stream = 'https://sandbox-desktop.stream.test'
    await blockLoadFrom('https://other-host.test')
    await blockLoadFrom(stream, { directive: 'img-src' })
    await blockLoadFrom(stream, { disposition: 'report' })
    expect(document.querySelector('iframe')?.src).toBe(url)
    expect(queryByText("The desktop couldn't open")).toBeNull()

    await blockLoadFrom(stream)

    expect(document.querySelector('iframe')).toBeNull()
    byText("The desktop couldn't open")
    byText("The app's settings block this desktop.")
    byRole('button', 'Try again')
    expect(queryByText('Live')).toBeNull()
  })
})
