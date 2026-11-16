// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { secretRevealPath } from '../../shared/secrets'
import {
  accessibleName,
  byRole,
  queryAllByRole,
  queryByRole,
} from '../../test-support/dom-queries'
import { FAKE_IDS, FAKE_TIME, fakeUser } from '../../test-support/fixtures/core'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { click, settle } from '../test-mount'
import {
  listPath,
  mountSecrets,
  rowsOf,
  secretNamed,
  secrets,
  secretsServer,
  sentBodies,
  values,
} from './secrets-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const org = FAKE_IDS.org
const replica = secretNamed('PROD_DATABASE_URL')
const vercel = secretNamed('VERCEL_TOKEN')

/** The names of the Copy buttons of the revealed values that show. */
function copies(view: HTMLElement): string[] {
  return Array.from(view.querySelectorAll('button'), accessibleName).filter(
    (name) => name.startsWith('Copy '),
  )
}

/** The values of the fixtures that the page shows as text. */
function shownValues(view: HTMLElement): string[] {
  return Object.values(values).filter((value) =>
    (view.textContent ?? '').includes(value),
  )
}

describe('the Secrets tab of an admin', () => {
  test('lists each secret with its description, who added it, and the last reveal, with dots for each value, and shows no value, also from a reply that holds one', async () => {
    const view = await mountSecrets(secretsServer())
    expect({
      rows: rowsOf(view),
      dots: queryAllByRole('img', 'Value set', view).length,
      values: shownValues(view),
    }).toEqual({
      rows: [
        [
          'FIGMA_TOKEN',
          'Reads the checkout designs in Figma.',
          'Added by Priya Raman',
        ],
        [
          'PROD_DATABASE_URL',
          'Read-only replica of the production database.',
          'Added by you · Revealed by you, 13 Jan',
        ],
        [
          'SENTRY_AUTH_TOKEN',
          'Uploads source maps and reads issues in Sentry.',
          'Added by Jonas Weber',
        ],
        [
          'VERCEL_TOKEN',
          'Deploys preview builds to Vercel.',
          'Added by Priya Raman · Revealed by you, 4 Jan',
        ],
      ],
      dots: 4,
      values: [],
    })
  })

  test('reveals one value at a time, on its own line with Copy and Hide, and the row shows the record of the reveal', async () => {
    const server = secretsServer()
    const copied: string[] = []
    const view = await mountSecrets(server, copied)
    const value = values[replica.id] ?? ''
    server.json('POST', secretRevealPath(org, replica.id), { value })
    server.json('POST', secretRevealPath(org, vercel.id), {
      value: values[vercel.id],
    })
    // The Worker records the reveal, so the list that reads again has it.
    const revealed = {
      revealedByUserId: fakeUser.id,
      revealedBy: {
        id: fakeUser.id,
        githubLogin: fakeUser.githubLogin,
        displayName: fakeUser.displayName,
        avatarUrl: fakeUser.avatarUrl,
      },
      revealedAt: FAKE_TIME,
    }
    server.json('GET', listPath, {
      secrets: secrets.map((secret) =>
        secret.id === replica.id ? { ...secret, lastReveal: revealed } : secret,
      ),
    })
    click(byRole('button', 'Reveal the value of PROD_DATABASE_URL', view))
    await settle()
    expect({
      values: shownValues(view),
      copies: copies(view),
      record: rowsOf(view)[1]?.[2],
      reveal: queryByRole(
        'button',
        'Reveal the value of PROD_DATABASE_URL',
        view,
      ),
    }).toEqual({
      values: [value],
      copies: ['Copy PROD_DATABASE_URL'],
      record: 'Added by you · Revealed by you, just now',
      reveal: null,
    })
    click(byRole('button', 'Copy PROD_DATABASE_URL', view))
    await settle()
    expect(copied).toEqual([value])
    click(byRole('button', 'Reveal the value of VERCEL_TOKEN', view))
    await settle()
    // A new reveal hides the value before it.
    expect({ values: shownValues(view), copies: copies(view) }).toEqual({
      values: [values[vercel.id]],
      copies: ['Copy VERCEL_TOKEN'],
    })
    click(byRole('button', 'Hide the value of VERCEL_TOKEN', view))
    expect({
      hidden: shownValues(view),
      sent: await sentBodies(server, 'POST', secretRevealPath(org, replica.id)),
    }).toEqual({ hidden: [], sent: [{}] })
  })
})
