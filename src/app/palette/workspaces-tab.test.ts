import { describe, expect, test } from 'vitest'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { ready } from '../store'
import type { PaletteQuery } from './palette-source'
import { paletteResults } from './palette-results'
import {
  extra,
  query,
  sections,
  shown,
  source,
  workspaces,
} from './results-test-kit'

describe('the Workspaces tab of the palette', () => {
  test('the Workspaces tab shows each section in the order of the list, also a collapsed one, and its filters choose the repository and the archived workspaces', () => {
    const banner = extra({
      id: 'banner',
      name: 'Black Friday banner',
      repositoryId: 'storefront',
      state: 'archived',
      archivedAt: FAKE_TIME - 2,
    })
    const redesign = extra({
      id: 'redesign',
      name: 'Checkout page redesign',
      repositoryId: 'storefront',
      state: 'archived',
      archivedAt: FAKE_TIME - 1,
    })
    const admin = extra({
      id: 'refunds',
      name: 'Refunds',
      repositoryId: 'admin-dashboard',
    })
    const list = ready({
      sections,
      workspaces: [...workspaces, banner, redesign, admin],
    })
    const tab = (filters: Partial<PaletteQuery>) =>
      paletteResults(query({ tab: 'workspaces', ...filters }), source({ list }))
    expect({
      all: shown(tab({})),
      storefront: shown(tab({ repositoryId: 'storefront' })),
      archived: shown(tab({ archived: true })),
      choices: tab({}).repositories.map((choice) => choice.name),
    }).toEqual({
      all: [
        [
          'General',
          [
            'Dark mode for emails',
            'Invoice PDF fonts',
            'Pricing page copy',
            'Refunds',
          ],
        ],
        [
          'Checkout',
          [
            'Fix flaky cart test',
            'Retry failed webhooks',
            'Apple Pay button',
            'Checkout address autocomplete',
          ],
        ],
        ['Infra', ['Upgrade to Next.js 16', 'Move retries to a queue']],
      ],
      storefront: [
        [
          'Checkout',
          [
            'Fix flaky cart test',
            'Apple Pay button',
            'Checkout address autocomplete',
          ],
        ],
        ['Infra', ['Upgrade to Next.js 16']],
      ],
      archived: [
        ['Archived', ['Checkout page redesign', 'Black Friday banner']],
      ],
      choices: [
        'acme/storefront',
        'acme/billing-service',
        'acme/marketing-site',
        'acme/admin-dashboard',
      ],
    })
  })

  test('a Workspaces tab without a workspace names where they show, and a query without a match says so', () => {
    const empty = (filters: Partial<PaletteQuery>) =>
      paletteResults(query(filters), source()).empty
    expect([
      empty({
        tab: 'workspaces',
        archived: true,
        repositoryId: 'marketing-site',
      }),
      empty({ tab: 'workspaces', archived: true }),
      empty({ tab: 'workspaces', repositoryId: 'admin-dashboard' }),
      empty({ tab: 'actions', text: ' refund ' }),
    ]).toEqual([
      {
        kind: 'line',
        text: 'Archived workspaces of acme/marketing-site show here',
      },
      { kind: 'line', text: 'Archived workspaces of Acme show here' },
      { kind: 'line', text: 'Workspaces of acme/admin-dashboard show here' },
      { kind: 'no-match', query: 'refund' },
    ])
  })
})
