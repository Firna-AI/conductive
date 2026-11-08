// @vitest-environment happy-dom

import { describe, expect, test } from 'vitest'
import { acceptedTermsSignInPath } from '../../shared/terms'
import { FakeApiServer } from '../../test-support/fake-api'
import { click, mountScreen } from '../test-mount'
import { startedApp } from '../test-render'
import { SignInScreen } from './SignInScreen'

describe('the sign-in screen', () => {
  test('Continue with GitHub signs in with the agreement to the current terms', async () => {
    const left: string[] = []
    const app = await startedApp(new FakeApiServer(), {
      leave: (url) => left.push(url),
    })
    const view = mountScreen(app, <SignInScreen />)
    const button = view.querySelector('button')
    if (!button) throw new Error('The sign-in screen has no button.')
    click(button)
    expect(left).toEqual([acceptedTermsSignInPath()])
  })
})
