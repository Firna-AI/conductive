// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { byRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import {
  billingQueue,
  storefrontQueue,
} from '../../test-support/fixtures/merge-queue'
import { mountScreen } from '../test-mount'
import { startedApp } from '../test-render'
import { layOutGroup, queuedList, type QueueWrite } from './queue-list-test-kit'
import { layOut, mouse, noActions, rowLink } from './row-drag-test-kit'
import { SectionList } from './SectionList'

async function mounted(
  units: readonly (readonly string[])[],
  writes: QueueWrite[] = [],
  canWrite = true,
) {
  const app = await startedApp(new FakeApiServer())
  const listed = queuedList(units, writes)
  const { groups } = listed
  const queue = canWrite
    ? listed.queue
    : { ...listed.queue, mayMove: () => false }
  const view = mountScreen(
    app,
    <SectionList
      actions={noActions}
      archived={groups.archived}
      groups={groups.sections}
      move={() => {}}
      now={FAKE_TIME}
      queue={queue}
      readOnly={false}
      selectedId={null}
      variant="sidebar"
    />,
  )
  return view
}

/** The words of each block: its repository, when named, and its rows. */
function blocks(view: HTMLElement) {
  return [...view.querySelectorAll('ol[aria-label^="Merge queue"]')].map(
    (list) => ({
      label: list.getAttribute('aria-label'),
      named: list.parentElement?.querySelector('h4')?.textContent ?? null,
      rows: [...list.querySelectorAll('li')].map((item) =>
        item.querySelector('a')?.getAttribute('href')?.split('/').at(-1),
      ),
    }),
  )
}

const status = (view: HTMLElement) =>
  view.querySelector('section[aria-label="Merge queue"] [role="status"]')
    ?.textContent

describe('the Merge queue group', () => {
  test('shows each queue from place 1 at the top of the list, names the repositories only for two queues, and joins the marks with a line', async () => {
    const one = await mounted(storefrontQueue)
    const first = one.querySelector('section')
    expect(first?.getAttribute('aria-label')).toBe('Merge queue')
    expect(blocks(one)).toEqual([
      {
        label: 'Merge queue, acme/storefront',
        named: null,
        rows: [
          'next-16',
          'fix-cart-flake',
          'apple-pay',
          'checkout-autocomplete',
        ],
      },
    ])
    // The checkout section lost its queued rows.
    expect(
      one.querySelector('section[aria-label="Checkout"]')?.textContent,
    ).not.toContain('Apple Pay')
    const items = [...one.querySelectorAll('ol li')]
    expect(items.map((item) => item.className.split(' ').length)).toEqual([
      1, 2, 2, 1,
    ])
    const two = await mounted([...storefrontQueue, ...billingQueue])
    expect(blocks(two).map((block) => block.named)).toEqual([
      'acme/storefront',
      'acme/billing-service',
    ])
  })

  test('collapses from its header, which then shows the count of its entries', async () => {
    const view = await mounted([...storefrontQueue, ...billingQueue])
    const toggle = byRole(
      'button',
      'Merge queue',
      view.querySelector('section[aria-label="Merge queue"]') ?? view,
    )
    act(() => toggle.click())
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(toggle.textContent).toBe('Merge queue6')
    expect(blocks(view)).toEqual([])
  })

  test('a drag moves the unit of an entry only inside its block, and a drop outside the block moves nothing', async () => {
    const writes: QueueWrite[] = []
    const view = await mounted(storefrontQueue, writes)
    const order = [
      'next-16',
      'fix-cart-flake',
      'apple-pay',
      'checkout-autocomplete',
    ]
    layOutGroup(view, 0, order, 120)
    layOut(view, 'General', 140, ['email-dark-mode', 'invoice-fonts'])
    // Checkout address autocomplete goes above Fix flaky cart test.
    mouse(rowLink(view, 'checkout-autocomplete'), 'pointerdown', {
      clientY: 90,
    })
    mouse(window, 'pointermove', { clientY: 96 })
    mouse(window, 'pointermove', { clientY: 45 })
    const moving = status(view)
    mouse(window, 'pointerup', { clientY: 45, buttons: 0 })
    // Apple Pay button previews a move, then releases beside the block.
    mouse(rowLink(view, 'apple-pay'), 'pointerdown', { clientY: 70 })
    mouse(window, 'pointermove', { clientY: 25 })
    mouse(window, 'pointerup', { clientX: 900, clientY: 25, buttons: 0 })
    expect({ moving, writes }).toEqual({
      moving:
        'Moving Checkout address autocomplete to place 2 of the merge queue',
      writes: [
        {
          kind: 'move',
          workspaceId: 'checkout-autocomplete',
          before: 'fix-cart-flake',
        },
      ],
    })
  })

  test('a long press of a finger lifts an entry on a phone, and a member without write access moves nothing', async () => {
    const writes: QueueWrite[] = []
    const view = await mounted(storefrontQueue, writes)
    const order = [
      'next-16',
      'fix-cart-flake',
      'apple-pay',
      'checkout-autocomplete',
    ]
    layOutGroup(view, 0, order, 120)
    const finger = { pointerId: 2, pointerType: 'touch' }
    vi.useFakeTimers()
    try {
      mouse(rowLink(view, 'apple-pay'), 'pointerdown', {
        ...finger,
        clientY: 70,
      })
      act(() => vi.advanceTimersByTime(450))
      mouse(window, 'pointermove', { ...finger, clientY: 25 })
      mouse(window, 'pointerup', { ...finger, clientY: 25, buttons: 0 })
    } finally {
      vi.useRealTimers()
    }
    const reader: QueueWrite[] = []
    const readOnly = await mounted(storefrontQueue, reader, false)
    layOutGroup(readOnly, 0, order, 120)
    mouse(rowLink(readOnly, 'apple-pay'), 'pointerdown', { clientY: 70 })
    mouse(window, 'pointermove', { clientY: 76 })
    mouse(window, 'pointermove', { clientY: 25 })
    mouse(window, 'pointerup', { clientY: 25, buttons: 0 })
    expect({ writes, reader }).toEqual({
      writes: [{ kind: 'move', workspaceId: 'apple-pay', before: 'next-16' }],
      reader: [],
    })
  })

  test('a member stack moves as one unit, which stays faint in its place during the drag', async () => {
    const writes: QueueWrite[] = []
    const view = await mounted(
      [['webhook-retries', 'retry-queue'], ['invoice-fonts']],
      writes,
    )
    const order = ['webhook-retries', 'retry-queue', 'invoice-fonts']
    layOutGroup(view, 0, order)
    // The middle of Invoice PDF fonts is at 70 px, so 75 px is after it.
    mouse(rowLink(view, 'webhook-retries'), 'pointerdown', { clientY: 30 })
    mouse(window, 'pointermove', { clientY: 36 })
    mouse(window, 'pointermove', { clientY: 75 })
    const faint = ['webhook-retries', 'retry-queue', 'invoice-fonts'].map(
      (id) => rowLink(view, id).className.includes('placeholder'),
    )
    const moving = status(view)
    mouse(window, 'pointerup', { clientY: 75, buttons: 0 })
    expect({ faint, moving, writes }).toEqual({
      faint: [true, true, false],
      moving: 'Moving Retry failed webhooks to place 2 of the merge queue',
      writes: [{ kind: 'move', workspaceId: 'webhook-retries', before: null }],
    })
  })

  test('a row of a section over the group joins at the end of its queue, and a row that cannot join names its reason and takes no drop', async () => {
    const writes: QueueWrite[] = []
    const view = await mounted(storefrontQueue, writes)
    const order = [
      'next-16',
      'fix-cart-flake',
      'apple-pay',
      'checkout-autocomplete',
    ]
    layOut(view, 'General', 140, ['email-dark-mode', 'invoice-fonts'])
    layOut(view, 'Checkout', 260, ['webhook-retries'])
    layOutGroup(view, 0, order, 120)
    // Webhook retries has no queue of its repository, so the zone takes it.
    mouse(rowLink(view, 'webhook-retries'), 'pointerdown', { clientY: 290 })
    mouse(window, 'pointermove', { clientY: 296 })
    layOutGroup(view, 0, order, 120)
    mouse(window, 'pointermove', { clientY: 60 })
    const adding = status(view)
    mouse(window, 'pointerup', { clientY: 60, buttons: 0 })
    // Invoice PDF fonts targets a release branch.
    mouse(rowLink(view, 'invoice-fonts'), 'pointerdown', { clientY: 190 })
    mouse(window, 'pointermove', { clientY: 196 })
    layOutGroup(view, 0, order, 120)
    mouse(window, 'pointermove', { clientY: 60 })
    const refused = status(view)
    const zone = view.querySelector(
      'section[aria-label="Merge queue"]',
    )?.textContent
    mouse(window, 'pointerup', { clientY: 60, buttons: 0 })
    expect({ adding, refused, writes }).toEqual({
      adding: 'Adding Retry failed webhooks to the merge queue at place 1',
      refused:
        "Invoice PDF fonts can't join the merge queue. It targets release/2026.11. The queue merges into main.",
      writes: [{ kind: 'add', workspaceId: 'webhook-retries' }],
    })
    expect(zone).toContain('It targets release/2026.11.')
  })

  test('the keys that move a focused row move an entry inside its block', async () => {
    const writes: QueueWrite[] = []
    const view = await mounted(storefrontQueue, writes)
    const press = (id: string, key: string) =>
      act(() => {
        rowLink(view, id).dispatchEvent(
          new KeyboardEvent('keydown', { key, altKey: true, bubbles: true }),
        )
      })
    press('apple-pay', 'ArrowUp')
    press('next-16', 'ArrowUp')
    press('checkout-autocomplete', 'ArrowDown')
    expect(writes).toEqual([
      { kind: 'move', workspaceId: 'apple-pay', before: 'fix-cart-flake' },
    ])
    expect(view.querySelector('div > span[role="status"]')?.textContent).toBe(
      'Apple Pay button moves to place 2 of the merge queue.',
    )
  })

  test('leaving the live queue target clears the preview and a fresh release checks the hit', async () => {
    const writes: QueueWrite[] = []
    const view = await mounted(storefrontQueue, writes)
    const group = view.querySelector('section[aria-label="Merge queue"]')
    if (!group) throw new Error('The merge queue has no group.')
    const hit = vi.mocked(document.elementFromPoint)
    const original = hit.getMockImplementation()
    if (!original) throw new Error('The list has no hit test.')
    for (const release of [
      { clientX: 900, clientY: 60 },
      { clientY: 130 },
      { clientY: 60 },
    ]) {
      hit.mockImplementation(original)
      mouse(rowLink(view, 'webhook-retries'), 'pointerdown', { clientY: 290 })
      mouse(window, 'pointermove', { clientY: 296 })
      layOutGroup(
        view,
        0,
        ['next-16', 'fix-cart-flake', 'apple-pay', 'checkout-autocomplete'],
        120,
      )
      mouse(window, 'pointermove', { clientY: 60 })
      expect(status(view)).toContain('Adding Retry failed webhooks')
      if (release.clientY === 60 && release.clientX === undefined) {
        hit.mockReturnValue(null)
        act(() => group.dispatchEvent(new Event('scroll')))
        expect(status(view)).toBeUndefined()
      }
      mouse(window, 'pointerup', { ...release, buttons: 0 })
    }
    expect(writes).toEqual([])
  })
})
