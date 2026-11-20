import { act } from 'react'
import { expect } from 'vitest'
import type { AppModel } from '../../app/app-model'
import type { HeldRequests } from '../../app/test-kit'
import { rightClick } from '../../chat/components/tab-row-test-kit'
import { workspaceOwnerPath } from '../../shared/members'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import type { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, fakeUsers } from '../../test-support/fixtures/core'
import { click, settle } from '../test-mount'
import { applePayReply, menuItem, menuOf, rowLink } from './row-menu-test-kit'

/** The error of the current owner choices, when one shows. */
export function ownerError(): string | null {
  return (
    queryByRole('menu', 'Owner')?.parentElement?.querySelector('[role="alert"]')
      ?.textContent ?? null
  )
}

/** Older replies stay inert when Reassign to returns in the same row menu. */
export async function checkOwnerRepliesAfterAccessCycle(
  app: AppModel,
  server: FakeApiServer,
  held: HeldRequests,
): Promise<void> {
  const { org } = FAKE_IDS
  const acme = app.orgs.get().find((item) => item.id === org)
  if (!acme) throw new Error('The fake org is missing.')
  const ownerPath = workspaceOwnerPath(org, 'apple-pay')
  const replies = [
    {
      label: 'an old refusal after Reassign to returns in the same menu',
      body: {
        error: { code: 'user_suspended', message: 'Priya Raman is suspended.' },
      },
      status: 409,
    },
    {
      label: 'an old success after Reassign to returns in the same menu',
      body: applePayReply({ owner: fakeUsers[1] }),
      status: 200,
    },
  ]
  rightClick(rowLink('apple-pay'))
  const menu = byRole('menu', 'Apple Pay button')
  for (const reply of replies) {
    click(menuItem('Reassign to'))
    await settle()
    server.json('PUT', ownerPath, reply.body, reply.status)
    held.holdAnswer('PUT', ownerPath)
    click(menuItem('Priya Raman'))
    await settle()
    act(() => app.putOrg({ ...acme, role: 'member' }))
    act(() => app.putOrg({ ...acme, role: 'admin' }))
    click(menuItem('Reassign to'))
    await settle()
    const choices = byRole('menu', 'Owner')
    held.release('PUT', ownerPath)
    await settle()
    expect
      .soft(
        {
          sameMenu: queryByRole('menu', 'Apple Pay button') === menu,
          sameChoices: queryByRole('menu', 'Owner') === choices,
          items: menuOf('Apple Pay button'),
          owners: menuOf('Owner'),
          owner: app.org(org).workspace('apple-pay')?.owner.id,
          error: ownerError(),
        },
        reply.label,
      )
      .toEqual({
        sameMenu: true,
        sameChoices: true,
        items: ['Reassign to >', 'Rename', 'Copy link', 'Archive'],
        owners: ['Cal (checked)', 'Priya Raman', 'Jonas Weber'],
        owner: 'cal',
        error: null,
      })
  }
}
