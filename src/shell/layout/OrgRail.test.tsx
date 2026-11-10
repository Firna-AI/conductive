import { describe, expect, test } from 'vitest'
import { FakeApiServer } from '../../test-support/fake-api'
import { renderScreen, startedApp, textOf } from '../test-render'
import { OrgRail } from './OrgRail'

describe('OrgRail', () => {
  test('shows the saved initials of each org, and the initials of the name when an org has none', async () => {
    const app = await startedApp(new FakeApiServer())
    const boot = app.boot.get()
    if (boot.state !== 'ready') throw new Error('The app did not start.')
    // Futex saved FX. Its name alone gives FU.
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
    expect(text).toContain('AC Acme FX Futex FI Firna AL Acme Labs')
  })
})
