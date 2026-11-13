// @vitest-environment happy-dom

import { describe, expect, test } from 'vitest'
import { HeldRequests } from '../../app/test-kit'
import { ACCOUNT_PATHS } from '../../shared/account'
import {
  accessibleName,
  byRole,
  queryByRole,
  shownToasts,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { fakeUser } from '../../test-support/fixtures/core'
import { holdAnimationFrames } from '../../test-support/mount'
import { click, mountScreen, settle } from '../test-mount'
import { startedApp } from '../test-render'
import { AccountScreen } from './AccountScreen'

/** The Preferences tab of the account of the fake API, mounted. */
async function mountPreferences(server: FakeApiServer) {
  holdAnimationFrames()
  const held = new HeldRequests(server)
  const app = await startedApp(server, { fetch: held.fetch })
  const view = mountScreen(
    app,
    <AccountScreen connect={null} tab="preferences" user={fakeUser} />,
  )
  return { view, held }
}

/**
 * The open menu of Model and effort: whether its Fast row is on, and
 * whether each row is off. Null when the menu is closed.
 */
function modelMenu() {
  const menu = queryByRole('menu', 'Model and effort')
  if (!menu) return null
  const rows = Array.from(menu.querySelectorAll('[role^="menuitem"]'))
  const fast = byRole('menuitemcheckbox', 'Fast', menu)
  return {
    fast: fast.getAttribute('aria-checked'),
    off: rows.every((row) => row.getAttribute('aria-disabled') === 'true'),
  }
}

describe('Model and effort of Preferences', () => {
  test('a Fast press shows at once in the open menu, whose rows take no press until the save answers, and a failed save shows the saved choice', async () => {
    const server = new FakeApiServer()
    const { view, held } = await mountPreferences(server)
    const path = ACCOUNT_PATHS.defaultModel
    const fast = {
      agent: 'claude',
      model: 'Opus 5.5',
      effort: 'high',
      fast: true,
    }
    const error = {
      code: 'models_unavailable',
      message: 'The models are not available.',
    }
    server.json('PUT', path, { error }, 503)
    held.holdAnswer('PUT', path)
    const trigger = byRole('button', 'Model and effort: Opus 5.5, High', view)
    click(trigger)
    click(byRole('menuitemcheckbox', 'Fast'))
    await settle()
    const saving = modelMenu()
    click(byRole('menuitemradio', 'Medium'))
    await settle()
    expect({ saving, pressed: modelMenu() }).toEqual({
      saving: { fast: 'true', off: true },
      pressed: { fast: 'true', off: true },
    })
    held.release('PUT', path)
    await settle()
    const failed = {
      menu: modelMenu(),
      toasts: shownToasts().map((toast) => toast.textContent),
    }
    const medium = { ...fast, effort: 'medium', fast: false }
    server.json('PUT', path, { choice: medium })
    click(byRole('menuitemradio', 'Medium'))
    await settle()
    const writes = server.requests.filter((request) => request.method === 'PUT')
    expect({
      failed,
      sent: await Promise.all(writes.map((request) => request.json())),
      trigger: accessibleName(trigger),
    }).toEqual({
      failed: {
        menu: { fast: 'false', off: false },
        toasts: ["The model wasn't saved.The models are not available."],
      },
      sent: [{ choice: fast }, { choice: medium }],
      trigger: 'Model and effort: Opus 5.5, Medium',
    })
  })
})
