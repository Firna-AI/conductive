// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test } from 'vitest'
import { ComputerModel } from '../../app/computer-model'
import { useStore } from '../../app/store'
import { HeldRequests, ManualDelay } from '../../app/test-kit'
import { API_PATHS, orgPath } from '../../shared/api'
import { orgSettingsPaths } from '../../shared/org-settings'
import { FakeApiServer } from '../../test-support/fake-api'
import { coreFixtures, FAKE_IDS } from '../../test-support/fixtures/core'
import { useApp } from '../context'
import { click, mountScreen, settle, typeText } from '../test-mount'
import { startedApp } from '../test-render'
import { ComputerSettings } from './ComputerTab'
import { GeneralTab } from './GeneralTab'

/** The field with this label, and the Save button of its card. */
function editor(view: HTMLElement, label: string) {
  const fields = view.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
    'input, textarea',
  )
  const field = Array.from(fields).find((item) => {
    const labelledBy = item.getAttribute('aria-labelledby')
    const name = labelledBy
      ? document.getElementById(labelledBy)?.textContent
      : item.getAttribute('aria-label')
    return name === label
  })
  const buttons = field?.closest('section')?.querySelectorAll('button') ?? []
  const save = Array.from(buttons).find((button) =>
    button.textContent?.startsWith('Save'),
  )
  if (!field || !save) throw new Error(`The editor ${label} is missing.`)
  return { field, save }
}

/** The General tab of the org, as the settings screen shows it. */
function General() {
  const org = useStore(useApp().orgs).find((item) => item.id === FAKE_IDS.org)
  return org ? <GeneralTab org={org} /> : null
}

describe('the editors of saved settings', () => {
  test('a script keeps the text typed while its save waits, an unchanged script takes the answer, and Save keeps the focus', async () => {
    const server = new FakeApiServer()
    const held = new HeldRequests(server)
    const app = await startedApp(server, { fetch: held.fetch })
    const [org] = app.orgs.get()
    if (!org) throw new Error('The app has no org.')
    await app.org(org.id).reload('builds')
    const computer = new ComputerModel(app.org(org.id), new ManualDelay().delay)
    await computer.load()
    const view = mountScreen(
      app,
      <ComputerSettings computer={computer} org={org} />,
    )
    const install = () => editor(view, 'Install software')
    const path = orgSettingsPaths.settings(org.id)
    const answer = (installScript: string) =>
      server.json('PATCH', path, {
        settings: {
          ...coreFixtures().settings.settings,
          installScript,
          startupScript: 'redis-server --port 6380',
        },
      })
    // The user types more while the answer of the first save waits.
    answer('pnpm install')
    held.holdAnswer('PATCH', path)
    typeText(install().field, 'pnpm install')
    click(install().save)
    typeText(install().field, 'pnpm install --frozen-lockfile')
    held.release('PATCH', path)
    await settle()
    const typed = {
      install: install().field.value,
      focus: document.activeElement === install().field,
      startup: editor(view, 'Startup script').field.value,
    }
    // The next save sends the newer text. Save turns off and keeps the
    // focus, so it must not be natively disabled while it has the focus.
    answer('pnpm install --frozen-lockfile')
    const save = install().save
    click(save)
    await settle()
    expect({
      typed,
      saved: {
        install: install().field.value,
        focus: document.activeElement === save,
        nativelyOff: save.disabled,
      },
    }).toEqual({
      typed: {
        install: 'pnpm install --frozen-lockfile',
        focus: true,
        startup: 'redis-server --port 6380',
      },
      saved: {
        install: 'pnpm install --frozen-lockfile',
        focus: true,
        nativelyOff: false,
      },
    })
  })

  test('a name keeps its draft after a failed save and a rename elsewhere, a saved name takes the answer, and Save keeps the focus', async () => {
    const server = new FakeApiServer()
    const { orgs } = coreFixtures()
    const [acme, ...others] = orgs.orgs
    const path = orgPath(FAKE_IDS.org)
    const app = await startedApp(server)
    const view = mountScreen(app, <General />)
    const name = () => editor(view, 'Name')
    server.json(
      'PATCH',
      path,
      { error: { code: 'server_error', message: 'The request failed.' } },
      500,
    )
    typeText(name().field, 'Acme Labs ')
    click(name().save)
    await settle()
    // A read of the orgs brings a rename by another admin.
    server.json('GET', API_PATHS.orgs, {
      orgs: [{ ...acme, name: 'Acme Inc' }, ...others],
    })
    await act(() => app.start())
    const failed = name().field.value
    server.json('PATCH', path, { org: { ...acme, name: 'Acme Labs' } })
    const save = name().save
    click(save)
    await settle()
    expect({
      failed,
      saved: name().field.value,
      focus: document.activeElement === save,
      nativelyOff: save.disabled,
    }).toEqual({
      failed: 'Acme Labs ',
      saved: 'Acme Labs',
      focus: true,
      nativelyOff: false,
    })
  })
})
