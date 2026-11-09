import { describe, expect, test } from 'vitest'
import { coreFixtures, FAKE_TIME } from '../../test-support/fixtures/core'
import { parseRoute, routes } from '../router'
import { paletteOrg } from './palette-org'

const orgs = coreFixtures().orgs.orgs
const [acme, futex, firna] = orgs
const deletedAcme = {
  ...acme,
  deletion: { deletedAt: FAKE_TIME, deletesAt: FAKE_TIME + 1 },
}

/** The org of the palette on a page, as its ID. */
function orgOn(
  path: string,
  list: typeof orgs,
  lastOrgId: string | null,
): string | null {
  return paletteOrg(parseRoute(path, ''), list, lastOrgId)?.id ?? null
}

describe('the org of the palette', () => {
  test('is the org of the page, else the last org of the tab, else the first org that is not deleted, and never a deleted org', () => {
    const account = routes.account()
    expect({
      orgPage: orgOn(routes.org(futex.id), orgs, firna.id),
      account: orgOn(account, orgs, firna.id),
      accountFirstOpen: orgOn(account, orgs, null),
      accountUnknownLast: orgOn(account, orgs, 'gone'),
      deletedLast: orgOn(account, [deletedAcme, futex, firna], acme.id),
      deletedPage: orgOn(
        routes.org(acme.id),
        [deletedAcme, futex, firna],
        acme.id,
      ),
      noOrg: orgOn(account, [deletedAcme], acme.id),
    }).toEqual({
      orgPage: futex.id,
      account: firna.id,
      accountFirstOpen: acme.id,
      accountUnknownLast: acme.id,
      deletedLast: futex.id,
      deletedPage: futex.id,
      noOrg: null,
    })
  })
})
