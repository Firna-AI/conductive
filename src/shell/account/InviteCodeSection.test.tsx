// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { AppModel } from '../../app/app-model'
import { testServices } from '../../app/test-kit'
import {
  joinPath,
  WAITLIST_PATHS,
  type WaitlistStateResponse,
} from '../../shared/waitlist'
import { byRole, queryByLabel } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_ORIGIN } from '../../test-support/fixtures/core'
import {
  accessState,
  ownInviteCode,
} from '../../test-support/fixtures/waitlist'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  press,
  waitFor,
} from '../../test-support/mount'
import { mountScreen } from '../test-mount'
import { textOf } from '../test-render'
import { InviteCodeSection } from './InviteCodeSection'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const link = `${FAKE_ORIGIN}${joinPath('K7QHM-3XP2R')}`

/** The section over a waitlist state, once its read answered. */
async function showSection(
  state: WaitlistStateResponse,
  copy: (text: string | Promise<string>) => Promise<void> = async () =>
    undefined,
) {
  const server = new FakeApiServer()
  server.json('GET', WAITLIST_PATHS.state, state)
  const app = new AppModel(testServices(server, { copy }))
  const view = mountScreen(app, <InviteCodeSection />)
  await waitFor(
    () => app.account.waitlist.get().state === 'ready',
    'the invite code',
  )
  return view
}

describe('the invite code of the account', () => {
  test('shows the invite link, the code, and the invites left, in each state of the code and of sign-ups', async () => {
    holdAnimationFrames()
    const paused =
      'Invite code 3 of 5 invites left Sign-ups are paused Your link works again when sign-ups resume. Copy Or share the code K7QHM-3XP2R .'
    const cases = [
      [
        'invites left',
        accessState,
        'Invite code 3 of 5 invites left Share your link. Each person who signs up with it skips the waitlist. Copy Or share the code K7QHM-3XP2R .',
        link,
      ],
      [
        'sign-ups paused',
        { ...accessState, signupsPaused: true },
        paused,
        link,
      ],
      [
        'open sign-up',
        { ...accessState, waitlistOn: false },
        'Invite code 3 of 5 invites left Anyone can sign up now Your invites stay for later. Copy Or share the code K7QHM-3XP2R .',
        link,
      ],
      [
        'the waitlist off while sign-ups are paused',
        { ...accessState, waitlistOn: false, signupsPaused: true },
        paused,
        link,
      ],
      [
        'every invite used',
        { ...accessState, signupsPaused: true, referralCode: ownInviteCode(5) },
        'Invite code 0 of 5 invites left Your invites let 5 people skip the waitlist.',
        null,
      ],
      [
        'turned off',
        {
          ...accessState,
          referralCode: { ...ownInviteCode(), disabled: true },
        },
        'Invite code Off Conductive turned off your invite code.',
        null,
      ],
    ] as const
    for (const [name, state, text, shared] of cases) {
      const view = await showSection(state)
      const field = queryByLabel('Invite link', view)
      expect(
        {
          text: textOf(view.innerHTML),
          link: field instanceof HTMLInputElement ? field.value : null,
        },
        name,
      ).toEqual({ text, link: shared })
    }
  })

  test('Copy copies the invite link', async () => {
    holdAnimationFrames()
    const copied: string[] = []
    const view = await showSection(accessState, async (text) => {
      copied.push(await text)
    })
    await press(byRole('button', 'Copy the invite link', view))
    await waitFor(() => copied.length > 0, 'the copy')
    expect(copied).toEqual([link])
  })
})
