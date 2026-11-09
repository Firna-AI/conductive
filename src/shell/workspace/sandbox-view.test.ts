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
        orgNotice: false,
      },
      owner: {
        refusal: { problem: 'refused', reason: ownerWords },
        bar: { problem: 'refused', reason: ownerWords },
        panel: { problem: 'refused', reason: ownerWords },
        orgNotice: false,
      },
      none: {
        refusal: null,
        bar: { problem: 'error', message: saved, firstStart: false },
        panel: { problem: 'error', message: saved, firstStart: false },
        orgNotice: false,
      },
      first: {
        refusal: null,
        bar: { problem: 'error', message: saved, firstStart: true },
        panel: { problem: 'error', message: saved, firstStart: true },
        orgNotice: false,
      },
    })
  })
})
