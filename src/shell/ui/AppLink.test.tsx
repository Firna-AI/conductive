// @vitest-environment happy-dom

import { describe, expect, test } from 'vitest'
import { memoryNavigation } from '../../app/navigation'
import { FakeApiServer } from '../../test-support/fake-api'
import { click, mountScreen } from '../test-mount'
import { startedApp } from '../test-render'
import { AppLink } from './AppLink'

describe('AppLink', () => {
  test('a link to the current address replaces it, and another link adds an entry', async () => {
    const app = await startedApp(new FakeApiServer())
    const navigation = memoryNavigation('/orgs/acme')
    const view = mountScreen(
      app,
      <>
        <AppLink to="/orgs/acme">Same</AppLink>
        <AppLink to="/orgs/futex">Other</AppLink>
      </>,
      { navigation },
    )
    const [same, other] = Array.from(view.querySelectorAll('a'))
    if (!same || !other) throw new Error('The links did not draw.')
    click(same)
    const afterSame = [...navigation.history]
    click(other)
    expect({ afterSame, after: [...navigation.history] }).toEqual({
      afterSame: ['/orgs/acme'],
      after: ['/orgs/acme', '/orgs/futex'],
    })
  })
})
