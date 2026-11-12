import { describe, expect, test } from 'vitest'
import { ApiError } from '../../app/api/client'
import { sandboxView } from './sandbox-view'

const saved =
  'The cloud computer did not start within the 20-minute limit. Try again.'
const orgWords =
  'This org is suspended. For questions, write to abuse@conductive.build.'
const ownerWords = 'Jonas is suspended, so this workspace cannot start.'

describe('the sandbox view of an open workspace', () => {
  test('a refusal of the org or the owner comes before the saved message of a failed start, which shows when nothing refuses the start and marks a failed first start', () => {
    const failed = {
      sandbox: 'error',
      savedError: saved,
      firstStart: false,
      opened: true,
    } as const
    expect({
      org: sandboxView({ ...failed, suspended: true, startError: null }),
      owner: sandboxView({
        ...failed,
        suspended: false,
        startError: new ApiError(403, 'user_suspended', ownerWords),
      }),
      none: sandboxView({ ...failed, suspended: false, startError: null }),
      first: sandboxView({
        ...failed,
        firstStart: true,
        suspended: false,
        startError: null,
      }),
    }).toEqual({
      org: {
        refusal: { problem: 'refused', reason: orgWords },
        bar: { problem: 'refused', reason: orgWords },
        panel: { problem: 'refused', reason: orgWords },
        resumingAtOpen: false,
        orgNotice: false,
      },
      owner: {
        refusal: { problem: 'refused', reason: ownerWords },
        bar: { problem: 'refused', reason: ownerWords },
        panel: { problem: 'refused', reason: ownerWords },
        resumingAtOpen: false,
        orgNotice: false,
      },
      none: {
        refusal: null,
        bar: { problem: 'error', message: saved, firstStart: false },
        panel: { problem: 'error', message: saved, firstStart: false },
        resumingAtOpen: false,
        orgNotice: false,
      },
      first: {
        refusal: null,
        bar: { problem: 'error', message: saved, firstStart: true },
        panel: { problem: 'error', message: saved, firstStart: true },
        resumingAtOpen: false,
        orgNotice: false,
      },
    })
  })
  test('until the open ends, a sandbox that the open resumes shows the composer in place of its bar and Starting in the header, and its panels keep the notice', () => {
    const view = (
      sandbox: 'stopped' | 'error' | 'archived',
      extra: { firstStart?: boolean; suspended?: boolean } = {},
    ) => {
      const { bar, panel, resumingAtOpen } = sandboxView({
        sandbox,
        suspended: extra.suspended ?? false,
        startError: null,
        savedError: null,
        firstStart: extra.firstStart ?? false,
        opened: false,
      })
      return { bar, panel: panel?.problem, resumingAtOpen }
    }
    expect({
      stopped: view('stopped'),
      laterError: view('error'),
      firstStart: view('error', { firstStart: true }),
      suspended: view('stopped', { suspended: true }),
      archived: view('archived'),
    }).toEqual({
      stopped: { bar: null, panel: 'stopped', resumingAtOpen: true },
      laterError: { bar: null, panel: 'error', resumingAtOpen: true },
      firstStart: {
        bar: { problem: 'error', message: null, firstStart: true },
        panel: 'error',
        resumingAtOpen: false,
      },
      suspended: {
        bar: { problem: 'refused', reason: orgWords },
        panel: 'refused',
        resumingAtOpen: false,
      },
      archived: {
        bar: { problem: 'archived', restore: undefined },
        panel: 'archived',
        resumingAtOpen: false,
      },
    })
  })
})
