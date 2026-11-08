// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { memoryNavigation, NavigationContext } from '../../app/navigation'
import { routes } from '../../app/router'
import { requestLines } from '../../app/test-kit'
import { deleteOrgPath, restoreOrgPath } from '../../shared/orgs'
import { byDialog, byRole, queryByRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, fakeUser } from '../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  press,
  requestDialogClose,
  typeText,
  waitFor,
} from '../../test-support/mount'
import { Shell } from '../Shell'
import { click, mountScreen } from '../test-mount'
import { startedApp } from '../test-render'
import { GeneralTab } from './GeneralTab'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org } = FAKE_IDS

/** The labels of the orgs in the rail, as a screen reader reads them. */
function railOrgs(view: HTMLElement): string[] {
  const rail = view.querySelector('nav[aria-label="Orgs"]')
  return Array.from(rail?.querySelectorAll('a[aria-label]') ?? [], (link) =>
    String(link.getAttribute('aria-label')),
  )
}

describe('the end of an org in the app', () => {
  test('Delete org opens the restore page of the faded org, and Restore shows the org again', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const app = await startedApp(server)
    const navigation = memoryNavigation(routes.settings(org))
    const view = mountScreen(
      app,
      <NavigationContext.Provider value={navigation}>
        <Shell />
      </NavigationContext.Provider>,
    )
    const remove = await waitFor(
      () => queryByRole('button', 'Delete org', view),
      'the General tab of an admin',
    )
    const from = server.requests.length
    await press(remove)
    const dialog = byDialog('Delete Acme?')
    await typeText(byRole('textbox', 'Type Acme to confirm', dialog), 'Acme')
    await press(byRole('button', 'Delete org', dialog))
    const restore = await waitFor(
      () => queryByRole('button', 'Restore Acme', view),
      'the restore page of Acme',
    )
    const deleted = {
      address: navigation.href(),
      title: view.querySelector('main h2, main h1')?.textContent,
      rail: railOrgs(view),
    }
    await press(restore)
    await waitFor(
      () => queryByRole('button', 'Restore Acme', view) === null,
      'Acme as an active org',
    )
    expect({
      deleted,
      restored: {
        address: navigation.href(),
        rail: railOrgs(view),
        org: app.orgs.get().find((item) => item.id === org),
      },
      writes: requestLines(server)
        .slice(from)
        .filter((line) => !line.startsWith('GET ')),
    }).toEqual({
      deleted: {
        address: routes.org(org),
        title: 'Acme is deleted on 22 January',
        rail: ['Acme, deleted', 'Futex', 'Firna', 'Create org', 'Account'],
      },
      restored: {
        address: routes.org(org),
        rail: ['Acme', 'Futex', 'Firna', 'Create org', 'Account'],
        org: { id: org, name: 'Acme', initials: 'AC', role: 'admin' },
      },
      writes: [`POST ${deleteOrgPath(org)}`, `POST ${restoreOrgPath(org)}`],
    })
  })

  // The question is a modal `<dialog>`: the browser keeps the focus inside
  // it and focuses its first field, which happy-dom does not do. The real
  // browser check covers those two parts.
  test('Escape closes the Delete org question, and the focus goes back to Delete org', async () => {
    holdAnimationFrames()
    const app = await startedApp(new FakeApiServer())
    const [acme] = app.orgs.get()
    if (!acme) throw new Error('The app has no org.')
    const view = mountScreen(app, <GeneralTab org={acme} user={fakeUser} />)
    const trigger = byRole('button', 'Delete org', view)
    click(trigger)
    const dialog = byDialog('Delete Acme?')
    click(byRole('textbox', 'Type Acme to confirm', dialog))
    await requestDialogClose(dialog)
    expect({
      closed: queryByRole('dialog', 'Delete Acme?') === null,
      trigger: document.activeElement === trigger,
    }).toEqual({ closed: true, trigger: true })
  })
})
