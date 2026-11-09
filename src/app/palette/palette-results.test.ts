import { describe, expect, test } from 'vitest'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { ready } from '../store'
import { paletteResults } from './palette-results'
import {
  accountRows,
  extra,
  query,
  sections,
  shown,
  source,
  workspaces,
} from './results-test-kit'

describe('the All tab of the palette', () => {
  test('with an empty field, the All tab shows five recent workspaces by their latest activity, then the actions and the settings with their pages', () => {
    const times: Record<string, number> = {
      'invoice-fonts': 10,
      'retry-queue': 9,
      'pricing-copy': 8,
      'checkout-autocomplete': 7,
      'apple-pay': 6,
      'next-16': 5,
      'email-dark-mode': 4,
      'fix-cart-flake': 3,
    }
    const list = workspaces.map((workspace) => ({
      ...workspace,
      updatedAt: times[workspace.id] ?? 0,
      state:
        workspace.id === 'invoice-fonts'
          ? ('archived' as const)
          : workspace.state,
    }))
    const results = paletteResults(
      query(),
      source({
        list: ready({ sections, workspaces: list }),
        openWorkspaceId: 'checkout-autocomplete',
      }),
    )
    expect(shown(results)).toEqual([
      [
        'Recent workspaces',
        [
          'Move retries to a queue',
          'Pricing page copy',
          'Apple Pay button',
          'Upgrade to Next.js 16',
          'Dark mode for emails',
        ],
      ],
      [
        'Actions',
        ['New workspace', 'Create org', 'Switch to Futex', 'Switch to Firna'],
      ],
      [
        'Settings',
        [
          'General · Acme settings',
          'Repositories · Acme settings',
          'Cloud computer · Acme settings',
          'Members · Acme settings',
          ...accountRows.map((row) => `${row} · Account`),
        ],
      ],
    ])
  })

  test('a search on the All tab looks at the name, the branch, and the repository of a workspace, and the words of a command, with the archived workspaces last', () => {
    const taxes = extra({ id: 'vat-rounding', name: 'Sales tax' })
    const stripe = extra({
      id: 'stripe-sdk',
      name: 'Stripe SDK upgrade',
      repositoryId: 'billing-service',
      state: 'archived',
      archivedAt: FAKE_TIME,
    })
    const list = ready({ sections, workspaces: [...workspaces, taxes, stripe] })
    const search = (text: string) =>
      shown(paletteResults(query({ text }), source({ list })))
    expect({
      name: search('sales TAX'),
      branch: search('rounding vat'),
      repository: search('billing'),
      words: search('claude'),
    }).toEqual({
      name: [['Workspaces', ['Sales tax']]],
      branch: [['Workspaces', ['Sales tax']]],
      repository: [
        [
          'Workspaces',
          [
            'Invoice PDF fonts',
            'Retry failed webhooks',
            'Move retries to a queue',
          ],
        ],
        ['Archived', ['Stripe SDK upgrade']],
      ],
      words: [['Settings', ['Agents · Account']]],
    })
  })
})
