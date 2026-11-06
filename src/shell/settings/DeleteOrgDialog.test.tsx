// @vitest-environment happy-dom

import { useState } from 'react'
import { describe, expect, test } from 'vitest'
import type { OrgSummary } from '../../shared/orgs'
import { FakeApiServer } from '../../test-support/fake-api'
import { click, mountScreen, press } from '../test-mount'
import { startedApp } from '../test-render'
import { OverlayHost } from '../ui/Overlay'
import { DeleteOrgDialog } from './DeleteOrgDialog'

/** The dialog behind a trigger, as the General tab opens it. */
function Opener(props: { org: OrgSummary }) {
  const [open, setOpen] = useState(false)
  return (
    <OverlayHost>
      <button onClick={() => setOpen(true)} type="button">
        Delete org
      </button>
      {open ? (
        <DeleteOrgDialog close={() => setOpen(false)} org={props.org} />
      ) : null}
    </OverlayHost>
  )
}

describe('DeleteOrgDialog', () => {
  test('keeps Shift+Tab inside from its name field, and Escape in the field closes it and gives the focus back', async () => {
    const app = await startedApp(new FakeApiServer())
    const [org] = app.orgs.get()
    if (!org) throw new Error('The app has no org.')
    const view = mountScreen(app, <Opener org={org} />)
    const trigger = view.querySelector('button')
    if (!trigger) throw new Error('The trigger is missing.')
    click(trigger)
    const field = document.querySelector<HTMLElement>('[role="dialog"] input')
    if (!field) throw new Error('The dialog has no name field.')
    const opened = document.activeElement === field
    press(field, 'Tab', { shift: true })
    const fromField = document.activeElement?.textContent
    click(field)
    press(field, 'Escape')
    expect({
      opened,
      fromField,
      closed: document.querySelector('[role="dialog"]') === null,
      trigger: document.activeElement === trigger,
    }).toEqual({
      opened: true,
      fromField: 'Cancel',
      closed: true,
      trigger: true,
    })
  })
})
