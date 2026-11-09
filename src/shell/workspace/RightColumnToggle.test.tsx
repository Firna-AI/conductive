// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import {
  accessibleName,
  byRole,
  queryByLabel,
  queryByRole,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import { click, press, settle } from '../test-mount'
import { openTab, socketsOf } from './wiring-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS

/**
 * Whether the right column shows, and the name of the last button of the
 * workspace header, where the toggle sits.
 */
function layout(view: HTMLElement) {
  const buttons = view.querySelectorAll('main header button')
  const last = buttons.item(buttons.length - 1)
  return {
    column: queryByLabel('Files and tools', view) !== null,
    lastButton: accessibleName(last),
  }
}

function offersTerminal(view: HTMLElement): boolean {
  click(byRole('button', 'Search', view))
  click(byRole('tab', 'Actions', view))
  const offered = queryByRole('option', 'Go to Terminal', view) !== null
  press(byRole('combobox', 'Search', view), 'Escape')
  return offered
}

describe('the toggle of the right column', () => {
  test('hides the right column for the whole tab, keeps its terminal connected, and shows it again', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const { events, opened } = socketsOf(server)
    const here = routes.workspace(org, id)
    const { view, navigation } = await openTab(server, here, { events })
    expect(layout(view)).toEqual({
      column: true,
      lastButton: 'Hide the right column',
    })

    click(byRole('button', 'Hide the right column', view))
    expect(layout(view)).toEqual({
      column: false,
      lastButton: 'Show the right column',
    })
    expect(opened.map(({ socket }) => socket.closed)).toEqual([false])
    expect(offersTerminal(view)).toBe(false)

    // The choice holds when the workspace opens again in the same tab.
    act(() => navigation.push(routes.org(org)))
    await settle()
    act(() => navigation.push(here))
    await settle()
    expect(layout(view)).toEqual({
      column: false,
      lastButton: 'Show the right column',
    })

    click(byRole('button', 'Show the right column', view))
    expect(layout(view)).toEqual({
      column: true,
      lastButton: 'Hide the right column',
    })
    expect(offersTerminal(view)).toBe(true)
  })
})
