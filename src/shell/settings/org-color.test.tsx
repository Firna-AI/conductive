// @vitest-environment happy-dom

import { describe, expect, test } from 'vitest'
import { useStore } from '../../app/store'
import { orgPath } from '../../shared/api'
import { FakeApiServer } from '../../test-support/fake-api'
import { coreFixtures, FAKE_IDS } from '../../test-support/fixtures/core'
import { useApp } from '../context'
import { click, mountScreen, settle } from '../test-mount'
import { startedApp } from '../test-render'
import { OrgTile } from '../ui/Avatars'
import { GeneralTab } from './GeneralTab'

/** The General tab of the org, as the settings screen shows it. */
function General() {
  const org = useStore(useApp().orgs).find((item) => item.id === FAKE_IDS.org)
  return org ? (
    <GeneralTab org={org} user={coreFixtures().account.user} />
  ) : null
}

/** The swatch with this colour name. */
function swatch(view: HTMLElement, label: string): HTMLInputElement {
  const input = view.querySelector<HTMLInputElement>(
    `input[type="radio"][aria-label="${label}"]`,
  )
  if (!input) throw new Error(`The swatch ${label} is missing.`)
  return input
}

function checked(view: HTMLElement): string | null {
  return (
    view
      .querySelector<HTMLInputElement>('input[type="radio"]:checked')
      ?.getAttribute('aria-label') ?? null
  )
}

describe('the colour of an org', () => {
  test('a swatch saves the colour alone, and the org takes the answer', async () => {
    const server = new FakeApiServer()
    const [acme] = coreFixtures().orgs.orgs
    if (!acme) throw new Error('The fixtures have no org.')
    const app = await startedApp(server)
    const view = mountScreen(app, <General />)
    const before = checked(view)
    server.json('PATCH', orgPath(FAKE_IDS.org), {
      org: { ...acme, color: 'green' },
    })
    const from = server.requests.length
    click(swatch(view, 'Green'))
    await settle()
    const patch = server.requests
      .slice(from)
      .find((request) => request.method === 'PATCH')
    expect({
      before,
      body: await patch?.json(),
      after: checked(view),
      saved: app.orgs.get().find((org) => org.id === FAKE_IDS.org)?.color,
    }).toEqual({
      before: 'Blue',
      body: { color: 'green' },
      after: 'Green',
      saved: 'green',
    })
  })

  test('a failed save shows the saved colour again', async () => {
    const server = new FakeApiServer()
    const app = await startedApp(server)
    const view = mountScreen(app, <General />)
    server.json(
      'PATCH',
      orgPath(FAKE_IDS.org),
      { error: { code: 'server_error', message: 'The request failed.' } },
      500,
    )
    click(swatch(view, 'Red'))
    await settle()
    expect(checked(view)).toBe('Blue')
  })

  test('a member sees the colour as text, without swatches', async () => {
    const server = new FakeApiServer({ role: 'member' })
    const app = await startedApp(server)
    const view = mountScreen(app, <General />)
    expect({
      swatches: view.querySelectorAll('input[type="radio"]').length,
      text: view.textContent,
    }).toMatchObject({
      swatches: 0,
      text: expect.stringContaining('ColourBlue') as unknown,
    })
  })

  test('only the tile of the open org shows its colour, and an unknown key shows Blue', async () => {
    const app = await startedApp(new FakeApiServer())
    const view = mountScreen(
      app,
      <>
        <OrgTile current org={{ name: 'Acme', color: 'green' }} size={26} />
        <OrgTile org={{ name: 'Futex', color: 'green' }} size={26} />
        <OrgTile current org={{ name: 'Labs', color: 'sepia' }} size={26} />
      </>,
    )
    const initials = Array.from(
      view.querySelectorAll<HTMLElement>('.firna-text'),
      (item) => item.style.color.toLowerCase(),
    )
    // The dark scheme: Green, the grey of a tile that is not open, and Blue.
    expect(initials).toEqual(['#4ade80', '#b9bec5', '#5cc8ff'])
  })
})
