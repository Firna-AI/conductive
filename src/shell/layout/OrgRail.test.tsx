import { describe, expect, test } from 'vitest'
import { FakeApiServer } from '../../test-support/fake-api'
import { renderScreen, startedApp, textOf } from '../test-render'
import { OrgRail } from './OrgRail'

describe('OrgRail', () => {
  test('shows the saved initials of each org, the initials of the name when an org has none, and the key of each org in its hint', async () => {
    const app = await startedApp(new FakeApiServer())
    const boot = app.boot.get()
    if (boot.state !== 'ready') throw new Error('The app did not start.')
    // Futex saved FX. Its name alone gives FU. On Windows, Alt+1 to Alt+4
    // open the orgs, and the hint says each key in words and in chips.
    const orgs = [
      ...app.orgs.get(),
      { id: 'labs', name: 'Acme Labs', role: 'admin' as const },
    ]
    const text = textOf(
      renderScreen(
        app,
        <OrgRail
          current={{ org: 'acme' }}
          firstRun={false}
          operator={false}
          orgs={orgs}
          user={boot.user}
        />,
      ),
    )
    expect(text).toContain(
      'AC Acme Alt 1 Alt 1 FX Futex Alt 2 Alt 2 FI Firna Alt 3 Alt 3 AL Acme Labs Alt 4 Alt 4',
    )
  })
})
