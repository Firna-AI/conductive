// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { HeldRequests } from '../../app/test-kit'
import { rightClick } from '../../chat/components/tab-row-test-kit'
import { workspaceOwnerPath } from '../../shared/members'
import { sectionsPath } from '../../shared/sections'
import { byRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import {
  coreFixtures,
  FAKE_IDS,
  fakeUsers,
} from '../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import { openPaletteTab } from '../palette/palette-test-kit'
import { click, press, settle } from '../test-mount'
import {
  checkOwnerRepliesAfterAccessCycle,
  ownerError,
} from './row-menu-access-test-kit'
import {
  applePayReply,
  archived,
  focusName,
  itemsOf,
  menuItem,
  menuOf,
  openArchived,
  rowLink,
  serveList,
} from './row-menu-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace } = FAKE_IDS
const open = routes.workspace(org, workspace)

describe('the actions of a workspace menu', () => {
  test('a member moves, renames, and copies the link of each row, archives only their own, and gets only Copy link on an archived row', async () => {
    const server = new FakeApiServer({ role: 'member' })
    serveList(server, (item) =>
      item.id === 'webhook-retries' ? archived(item) : item,
    )
    await openPaletteTab(open, { server })
    const own = itemsOf('pricing-copy', 'Pricing page copy')
    const others = itemsOf('apple-pay', 'Apple Pay button')
    openArchived()
    const archivedRow = {
      browserMenu: rightClick(rowLink('webhook-retries')),
      menu: menuOf('Retry failed webhooks'),
    }
    press(document.activeElement ?? document.body, 'Escape')

    expect({ own, others, archivedRow }).toEqual({
      own: ['Move to section >', 'Rename', 'Copy link', 'Archive'],
      others: ['Move to section >', 'Rename', 'Copy link'],
      archivedRow: { browserMenu: false, menu: ['Copy link'] },
    })
  })

  test('an admin reassigns an archived row and copies its link, and a change of the role, the sections, or the workspace drops the actions that it takes away while the menu shows', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const held = new HeldRequests(server)
    const copies: string[] = []
    const ownerPath = workspaceOwnerPath(org, 'apple-pay')
    serveList(server, (item) =>
      item.id === 'webhook-retries' ? archived(item) : item,
    )
    const { app } = await openPaletteTab(open, {
      server,
      fetch: held.fetch,
      copy: async (text) => {
        copies.push(await text)
      },
    })
    const reload = () => act(() => app.org(org).reload('list'))
    openArchived()
    const archivedRow = itemsOf('webhook-retries', 'Retry failed webhooks')

    rightClick(rowLink('apple-pay'), { clientX: 120, clientY: 300 })
    click(menuItem('Reassign to'))
    await settle()
    const owners = menuOf('Owner')
    const acme = app.orgs.get().find((item) => item.id === org)
    if (!acme) throw new Error('The fake org is missing.')
    act(() => app.putOrg({ ...acme, role: 'member' }))
    const asMember = {
      items: menuOf('Apple Pay button'),
      owners: menuOf('Owner'),
      focus: focusName(),
    }
    act(() => menuItem('Move to section').focus())
    const { sections } = coreFixtures().sectionList
    server.json('GET', sectionsPath(org), {
      sections: sections.filter((section) => section.isDefault),
    })
    await reload()
    const generalOnly = {
      items: menuOf('Apple Pay button'),
      focus: focusName(),
    }
    act(() => menuItem('Rename').focus())
    serveList(server, (item) =>
      item.id === 'apple-pay' ? archived(item) : item,
    )
    await reload()

    expect
      .soft({
        archivedRow,
        owners,
        asMember,
        generalOnly,
        archived: menuOf('Apple Pay button'),
        archivedFocus: focusName(),
      })
      .toEqual({
        archivedRow: ['Reassign to >', 'Copy link'],
        owners: ['Cal (checked)', 'Priya Raman', 'Jonas Weber'],
        asMember: {
          items: ['Move to section >', 'Rename', 'Copy link', 'Archive'],
          owners: [],
          focus: 'Move to section',
        },
        generalOnly: {
          items: ['Rename', 'Copy link', 'Archive'],
          focus: 'Rename',
        },
        archived: ['Copy link'],
        archivedFocus: 'Copy link',
      })

    act(() => app.putOrg({ ...acme, role: 'admin' }))
    server.json('GET', sectionsPath(org), { sections })
    serveList(server, (item) => item)
    await reload()
    click(menuItem('Move to section'))
    serveList(server, (item) =>
      item.id === 'apple-pay' ? archived(item) : item,
    )
    await reload()
    expect
      .soft({
        items: menuOf('Apple Pay button'),
        sections: menuOf('Section'),
        focus: focusName(),
      })
      .toEqual({
        items: ['Reassign to >', 'Copy link'],
        sections: [],
        focus: 'Reassign to',
      })

    serveList(server, (item) => item)
    await reload()
    click(menuItem('Reassign to'))
    await settle()
    const ownerMenu = byRole('menu', 'Owner')
    server.json(
      'PUT',
      ownerPath,
      {
        error: { code: 'user_suspended', message: 'Priya Raman is suspended.' },
      },
      409,
    )
    held.holdAnswer('PUT', ownerPath)
    click(menuItem('Priya Raman'))
    await settle()
    server.json('GET', sectionsPath(org), {
      sections: sections.filter((section) => section.isDefault),
    })
    await reload()
    expect
      .soft({
        items: menuOf('Apple Pay button'),
        sameChoices: byRole('menu', 'Owner') === ownerMenu,
        owners: menuOf('Owner'),
        busy: menuItem('Priya Raman').getAttribute('aria-busy'),
        focus: focusName(),
      })
      .toEqual({
        items: ['Reassign to >', 'Rename', 'Copy link', 'Archive'],
        sameChoices: true,
        owners: ['Cal (checked)', 'Priya Raman', 'Jonas Weber'],
        busy: 'true',
        focus: 'Priya Raman',
      })
    held.release('PUT', ownerPath)
    await settle()
    expect.soft({ error: ownerError(), owners: menuOf('Owner') }).toEqual({
      error: 'The owner did not change. Priya Raman is suspended.',
      owners: ['Cal (checked)', 'Priya Raman', 'Jonas Weber'],
    })

    act(() => app.putOrg({ ...acme, role: 'member' }))
    act(() => app.putOrg({ ...acme, role: 'admin' }))
    click(menuItem('Reassign to'))
    await settle()
    expect.soft(ownerError()).toBeNull()
    server.json('PUT', ownerPath, applePayReply({ owner: fakeUsers[1] }))
    held.holdAnswer('PUT', ownerPath)
    click(menuItem('Priya Raman'))
    await settle()
    act(() => app.putOrg({ ...acme, role: 'member' }))
    expect
      .soft({ owners: menuOf('Owner'), focus: focusName() })
      .toEqual({ owners: [], focus: 'Rename' })
    press(document.activeElement ?? document.body, 'Escape')
    const dismissed = menuOf('Apple Pay button')
    rightClick(rowLink('apple-pay'))
    click(menuItem('Copy link'))
    await settle()
    expect
      .soft({ dismissed, afterCopy: menuOf('Apple Pay button'), copies })
      .toEqual({
        dismissed: [],
        afterCopy: [],
        copies: [applePayReply({}).workspace.link],
      })

    rightClick(rowLink('apple-pay'))
    act(() => app.putOrg({ ...acme, role: 'admin' }))
    click(menuItem('Reassign to'))
    await settle()
    held.release('PUT', ownerPath)
    await settle()
    expect
      .soft({
        items: menuOf('Apple Pay button'),
        owners: menuOf('Owner'),
        error: ownerError(),
        owner: app.org(org).workspace('apple-pay')?.owner.id,
      })
      .toEqual({
        items: ['Reassign to >', 'Rename', 'Copy link', 'Archive'],
        owners: ['Cal (checked)', 'Priya Raman', 'Jonas Weber'],
        error: null,
        owner: 'cal',
      })

    rightClick(rowLink('apple-pay'))
    click(menuItem('Reassign to'))
    await settle()
    const ownerBeforeUnmount = app.org(org).workspace('apple-pay')?.owner
    server.json('PUT', ownerPath, applePayReply({ owner: fakeUsers[2] }))
    held.holdAnswer('PUT', ownerPath)
    click(menuItem('Jonas Weber'))
    await settle()
    rightClick(rowLink('pricing-copy'))
    held.release('PUT', ownerPath)
    await settle()
    expect
      .soft(menuOf('Pricing page copy'))
      .toEqual(['Reassign to >', 'Rename', 'Copy link', 'Archive'])
    expect
      .soft(app.org(org).workspace('apple-pay')?.owner)
      .toBe(ownerBeforeUnmount)

    await checkOwnerRepliesAfterAccessCycle(app, server, held)
  })

  test('a nested row offers no Move to section, and the top-level row of its tree does', async () => {
    const server = new FakeApiServer({ subWorkspaces: true })
    await openPaletteTab(open, { server })
    expect({
      nested: itemsOf('places-client', 'Places API client'),
      topLevel: itemsOf(
        'checkout-autocomplete',
        'Checkout address autocomplete',
      ),
    }).toEqual({
      nested: ['Reassign to >', 'Rename', 'Copy link', 'Archive'],
      topLevel: [
        'Move to section >',
        'Reassign to >',
        'Rename',
        'Copy link',
        'Archive',
      ],
    })
  })
})
