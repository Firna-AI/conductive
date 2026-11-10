// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test } from 'vitest'
import { routes } from '../../app/router'
import { HeldRequests } from '../../app/test-kit'
import { workspacePath } from '../../shared/workspaces'
import { byRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { click, mountScreen, press, settle } from '../test-mount'
import { startedApp } from '../test-render'
import { OrgList } from './OrgList'

const org = FAKE_IDS.org
const fixtures = workspaceFixtures()

/** The answer of a move of the workspace to the section. */
function movedTo(workspaceId: string, sectionId: string) {
  const workspace = fixtures.workspaces.workspaces.find(
    (item) => item.id === workspaceId,
  )
  if (!workspace) throw new Error(`The fixture has no ${workspaceId}.`)
  return { ...fixtures.detail, workspace: { ...workspace, sectionId } }
}

/** Where the focus is: a row and its section, or the label of a field. */
function focusPlace(): string {
  const active = document.activeElement
  const section = active?.closest('section')?.getAttribute('aria-label')
  const row = fixtures.workspaces.workspaces.find(
    (item) => active?.getAttribute('href') === routes.workspace(org, item.id),
  )
  if (row && section) return `${row.id} in ${section}`
  return active?.getAttribute('aria-label') ?? active?.tagName ?? 'nothing'
}

describe('the workspace list', () => {
  test('only Alt with Up or Down moves a row, and moves keep row focus from the link or Archive and respect later focus changes', async () => {
    const server = new FakeApiServer()
    const held = new HeldRequests(server)
    const app = await startedApp(server, { fetch: held.fetch })
    await app.org(org).reload('list')
    const view = mountScreen(
      app,
      <>
        <input aria-label="Search" />
        <OrgList orgId={org} selectedId={null} variant="sidebar" />
      </>,
    )
    await settle()
    const link = (workspaceId: string) => {
      const found = view.querySelector<HTMLElement>(
        `a[href="${routes.workspace(org, workspaceId)}"]`,
      )
      if (!found) throw new Error(`The list has no row for ${workspaceId}.`)
      return found
    }
    const move = async (workspaceId: string) => {
      press(link(workspaceId), 'ArrowDown', { alt: true })
      await settle()
      return focusPlace()
    }
    // ⌥⌘↑ and Alt+Shift+↑ belong to Previous workspace, so the row stays.
    act(() => link('pricing-copy').focus())
    const sent = server.requests.length
    press(link('pricing-copy'), 'ArrowUp', { alt: true, meta: true })
    press(link('pricing-copy'), 'ArrowUp', { alt: true, shift: true })
    await settle()
    const shortcutKeys = {
      place: focusPlace(),
      requests: server.requests.length - sent,
    }
    // The last row of General moves to the next section.
    const pricingPath = workspacePath(org, 'pricing-copy')
    server.json('PATCH', pricingPath, movedTo('pricing-copy', 'checkout'))
    const row = link('pricing-copy').closest('li')
    if (!row) throw new Error('The workspace has no row.')
    const archive = byRole('button', 'Archive workspace', row)
    act(() => archive.focus())
    press(archive, 'ArrowDown', { alt: true })
    await settle()
    const archiveShortcut = focusPlace()
    await act(() => app.org(org).reload('list'))
    act(() => link('pricing-copy').focus())
    const nextSection = await move('pricing-copy')
    // The user moves the focus to another field. A read of the list puts
    // the row back in its section, and the focus stays in the field.
    const search = view.querySelector<HTMLElement>('[aria-label="Search"]')
    if (!search) throw new Error('The search field is missing.')
    click(search)
    await act(() => app.org(org).reload('list'))
    const afterRead = focusPlace()
    // The same holds when the user moves the focus to the page.
    act(() => link('pricing-copy').focus())
    await move('pricing-copy')
    act(() => link('pricing-copy').blur())
    await act(() => app.org(org).reload('list'))
    const afterPage = focusPlace()
    // A failed move puts the row back, and the focus goes with it.
    act(() => link('pricing-copy').focus())
    server.json(
      'PATCH',
      pricingPath,
      { error: { code: 'server_error', message: 'The request failed.' } },
      500,
    )
    held.hold('PATCH', pricingPath)
    const moving = await move('pricing-copy')
    held.release('PATCH', pricingPath)
    await settle()
    expect({
      shortcutKeys,
      archiveShortcut,
      nextSection,
      afterRead,
      afterPage,
      moving,
      failedMove: focusPlace(),
    }).toEqual({
      shortcutKeys: { place: 'pricing-copy in General', requests: 0 },
      archiveShortcut: 'pricing-copy in Checkout',
      nextSection: 'pricing-copy in Checkout',
      afterRead: 'Search',
      afterPage: 'BODY',
      moving: 'pricing-copy in Checkout',
      failedMove: 'pricing-copy in General',
    })
  })
})
