// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test } from 'vitest'
import sectionStyles from '../../../docs/mockups/src/components/workspaces/SectionList.module.css'
import rowStyles from '../../../docs/mockups/src/components/workspaces/WorkspaceRow.module.css'
import { memoryNavigation } from '../../app/navigation'
import { routes } from '../../app/router'
import { groupWorkspaces } from '../../app/sections'
import { windowKeys } from '../../app/services'
import type { ShortcutCommandId } from '../../shared/shortcut-commands'
import { workspacePath } from '../../shared/workspaces'
import { FakeApiServer } from '../../test-support/fake-api'
import {
  coreFixtures,
  FAKE_IDS,
  FAKE_TIME,
  fakeUser,
} from '../../test-support/fixtures/core'
import { withSubWorkspaces } from '../../test-support/fixtures/sub-workspaces'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { pressHintKey } from '../shortcuts/shortcut-test-kit'
import { mountScreen, press, settle } from '../test-mount'
import { startedApp } from '../test-render'
import { OrgList } from './OrgList'
import { SectionList } from './SectionList'
import type { RowVariant } from './WorkspaceRow'

const org = FAKE_IDS.org
const fixtures = workspaceFixtures()
/** The list of Acme with the two trees of the mockups in Checkout. */
const trees = withSubWorkspaces(fixtures.workspaces.workspaces)

const noActions = {
  toggle: () => undefined,
  rename: () => undefined,
  moveTo: () => undefined,
  newWorkspace: () => undefined,
  newSection: () => undefined,
  remove: () => undefined,
}

/** The workspace at an address of the app. */
function workspaceAt(href: string | null): string {
  const found = trees.find((item) => routes.workspace(org, item.id) === href)
  if (!found) throw new Error(`No workspace has the address ${href}.`)
  return found.id
}

/** The rows of a section, each with the steps of its indent. */
function indents(view: HTMLElement, section: string): string[] {
  const links = view.querySelectorAll(`section[aria-label="${section}"] li a`)
  return Array.from(links, (link) => {
    const names = link.className.split(' ')
    const step = [1, 2, 3].find((steps) =>
      names.includes(rowStyles[`indent${steps}`]),
    )
    const nested = names.includes(rowStyles.nested)
    const steps = nested ? (step ?? 'no step') : 0
    return `${workspaceAt(link.getAttribute('href'))} ${steps}`
  })
}

describe('the trees of the workspace list', () => {
  test('a nested row indents by each row above it in its tree, with the guide lines, in the sidebar and on the page, and a collapsed section counts its nested rows', async () => {
    const app = await startedApp(new FakeApiServer())
    const { sections } = coreFixtures().sectionList
    const groups = groupWorkspaces(sections, trees).sections
    const mount = (variant: RowVariant, collapsed = false) =>
      mountScreen(
        app,
        <SectionList
          actions={noActions}
          archived={[]}
          groups={groups.map((group) =>
            group.section.id === 'checkout'
              ? { ...group, section: { ...group.section, collapsed } }
              : group,
          )}
          move={() => undefined}
          now={FAKE_TIME}
          readOnly={false}
          selectedId={null}
          variant={variant}
        />,
      )
    const collapsed = mount('sidebar', true).querySelector(
      `section[aria-label="Checkout"] .${sectionStyles.count}`,
    )
    const tree = [
      'fix-cart-flake 0',
      'webhook-retries 0',
      'apple-pay 0',
      'merchant-validation 1',
      'wallet-button-tests 1',
      'checkout-autocomplete 0',
      'address-search-api 1',
      'places-client 2',
      'rate-limits 3',
      'rate-limit-load-test 3',
      'suggestion-list 1',
    ]
    expect({
      sidebar: indents(mount('sidebar'), 'Checkout'),
      page: indents(mount('page'), 'Checkout'),
      count: collapsed?.textContent,
    }).toEqual({ sidebar: tree, page: tree, count: '11' })
  })

  test('the keys of the list open its rows in tree order, Alt with Down moves a tree past the whole next tree, and on a nested row it moves nothing', async () => {
    const server = new FakeApiServer({ subWorkspaces: true })
    const app = await startedApp(server, { onKey: windowKeys(window) })
    await app.org(org).reload('list')
    const selected = 'rate-limit-load-test'
    const navigation = memoryNavigation(routes.workspace(org, selected))
    const view = mountScreen(
      app,
      <OrgList
        offerActions
        orgId={org}
        selectedId={selected}
        variant="sidebar"
        viewer={fakeUser}
      />,
      { navigation },
    )
    await settle()
    const open = (command: ShortcutCommandId) => {
      pressHintKey(app, command, document.body)
      return workspaceAt(navigation.href())
    }
    const keys = {
      eighth: open('workspace-8'),
      next: open('next-workspace'),
      previous: open('previous-workspace'),
    }
    const link = (workspaceId: string) => {
      const found = view.querySelector<HTMLElement>(
        `a[href="${routes.workspace(org, workspaceId)}"]`,
      )
      if (!found) throw new Error(`The list has no row for ${workspaceId}.`)
      return found
    }
    const sent = server.requests.length
    act(() => link('rate-limits').focus())
    const nestedKey = press(link('rate-limits'), 'ArrowDown', { alt: true })
    await settle()
    const nested = {
      prevented: nestedKey.defaultPrevented,
      requests: server.requests.length - sent,
    }
    const applePay = fixtures.workspaces.workspaces.find(
      (item) => item.id === 'apple-pay',
    )
    server.json('PATCH', workspacePath(org, 'apple-pay'), {
      ...fixtures.detail,
      workspace: applePay,
    })
    act(() => link('apple-pay').focus())
    press(link('apple-pay'), 'ArrowDown', { alt: true })
    const atOnce = indents(view, 'Checkout')
    await settle()
    expect({
      keys,
      nested,
      sent: await server.requests.at(-1)?.json(),
      atOnce,
      said: view.querySelector('[role="status"]')?.textContent,
    }).toEqual({
      keys: {
        eighth: 'wallet-button-tests',
        next: 'suggestion-list',
        previous: 'rate-limits',
      },
      nested: { prevented: true, requests: 0 },
      sent: { sectionId: 'checkout', position: 3 },
      atOnce: [
        'fix-cart-flake 0',
        'webhook-retries 0',
        'checkout-autocomplete 0',
        'address-search-api 1',
        'places-client 2',
        'rate-limits 3',
        'rate-limit-load-test 3',
        'suggestion-list 1',
        'apple-pay 0',
        'merchant-validation 1',
        'wallet-button-tests 1',
      ],
      said: 'Apple Pay button and 2 sub-workspaces move to Checkout, place 4.',
    })
  })
})
