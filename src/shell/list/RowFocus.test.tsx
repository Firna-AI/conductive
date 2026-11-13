// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { HeldRequests } from '../../app/test-kit'
import { sessionsPath } from '../../shared/sessions'
import { FakeApiServer } from '../../test-support/fake-api'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import { click, settle } from '../test-mount'
import { startedApp } from '../test-render'
import {
  away,
  here,
  id,
  messageField,
  mountTab,
  org,
} from '../workspace/kept-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/**
 * The link of the row of the workspace in the sidebar. The tile of the org
 * in the rail can link to the same workspace, so the query stays in the
 * sidebar.
 */
function sidebarRow(view: HTMLElement): HTMLElement {
  const row = view.querySelector<HTMLElement>(
    `aside[aria-label="Workspaces"] a[href="${here}"]`,
  )
  if (!row) throw new Error('The sidebar shows no row of the workspace.')
  return row
}

describe('a click on a workspace in the sidebar', () => {
  test('puts the focus in the message field when the chat shows', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const held = new HeldRequests(server)
    const app = await startedApp(server, { fetch: held.fetch })
    // The field shows only after the chat loads, so the request waits.
    held.holdAnswer('GET', sessionsPath(org, id))
    const { view, go } = mountTab(app)
    go(away)
    await settle()

    click(sidebarRow(view))
    await settle()
    expect(view.querySelector('[aria-label="Message"]')).toBeNull()
    await act(async () => held.release('GET', sessionsPath(org, id)))
    await settle()

    expect(document.activeElement).toBe(messageField(view))
    expect(app.composerFocus.get()).toBeNull()
  })

  test('puts the focus in the field of the open workspace too', async () => {
    holdAnimationFrames()
    const app = await startedApp(new FakeApiServer())
    const { view } = mountTab(app)
    await settle()
    expect(document.activeElement).not.toBe(messageField(view))

    click(sidebarRow(view))
    await settle()

    expect(document.activeElement).toBe(messageField(view))
  })

  test('leaves the focus where the person moved it before the chat showed', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const held = new HeldRequests(server)
    const app = await startedApp(server, { fetch: held.fetch })
    held.holdAnswer('GET', sessionsPath(org, id))
    const { view, go } = mountTab(app)
    go(away)
    await settle()

    click(sidebarRow(view))
    await settle()
    const settings = view.querySelector<HTMLElement>(
      `a[href="${routes.settings(org)}"]`,
    )
    act(() => settings?.focus())
    expect(document.activeElement).toBe(settings)
    await act(async () => held.release('GET', sessionsPath(org, id)))
    await settle()

    expect(document.activeElement).toBe(settings)
    expect(app.composerFocus.get()).toBeNull()
  })
})
