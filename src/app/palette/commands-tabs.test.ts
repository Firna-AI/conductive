import { describe, expect, test } from 'vitest'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { routes } from '../router'
import type { PaletteOffer } from './page-actions'
import { paletteResults } from './palette-results'
import type { PaletteSource } from './palette-source'
import {
  accountRows,
  acme,
  firna,
  futex,
  query,
  shown,
  source,
} from './results-test-kit'

describe('the Actions and Settings tabs of the palette', () => {
  test('the Actions tab puts the actions of the open workspace first, then those of the org, the orgs, the window, and Help with Send feedback, each under its label', () => {
    const run = () => undefined
    const offers: PaletteOffer[] = [
      { scope: { kind: 'window' }, actions: [{ id: 'hide-sidebar', run }] },
      {
        scope: { kind: 'org', orgId: futex.id },
        actions: [{ id: 'new-section', run }],
      },
      {
        scope: { kind: 'org', orgId: acme.id },
        actions: [{ id: 'new-section', run }],
      },
      {
        scope: {
          kind: 'workspace',
          workspaceId: 'checkout-autocomplete',
          name: 'Checkout address autocomplete',
        },
        actions: [
          { id: 'archive-workspace', run },
          { id: 'new-session', run },
        ],
      },
    ]
    const results = paletteResults(
      query({ tab: 'actions' }),
      source({ offers, openWorkspaceId: 'checkout-autocomplete' }),
    )
    expect(shown(results)).toEqual([
      ['Checkout address autocomplete', ['New session', 'Archive workspace']],
      ['Acme', ['New workspace', 'New section']],
      ['Orgs', ['Create org', 'Switch to Futex', 'Switch to Firna']],
      ['Window', ['Hide the sidebar']],
      ['Help', ['Send feedback']],
    ])
  })

  test('a suspended org offers no New workspace, a deleted org has no Switch to row, and without an org only Create org, Send feedback, and the Account settings show', () => {
    const deleted = {
      ...futex,
      deletion: { deletedAt: FAKE_TIME, deletesAt: FAKE_TIME + 1 },
    }
    const actions = (overrides: Partial<PaletteSource>) =>
      shown(paletteResults(query({ tab: 'actions' }), source(overrides)))
    expect({
      suspended: actions({ suspended: true }),
      deleted: actions({ orgs: [acme, deleted, firna] }),
      none: shown(paletteResults(query(), source({ org: null, orgs: [] }))),
    }).toEqual({
      suspended: [
        ['Orgs', ['Create org', 'Switch to Futex', 'Switch to Firna']],
        ['Help', ['Send feedback']],
      ],
      deleted: [
        ['Acme', ['New workspace']],
        ['Orgs', ['Create org', 'Switch to Firna']],
        ['Help', ['Send feedback']],
      ],
      none: [
        ['Actions', ['Create org', 'Send feedback']],
        ['Settings', accountRows.map((row) => `${row} · Account`)],
      ],
    })
  })

  test('a search by the label of Send feedback, or by each of its search words, finds it alone among the actions of the All tab', () => {
    const found = (text: string) =>
      shown(paletteResults(query({ text }), source()))
    const feedback = [['Actions', ['Send feedback']]]
    expect({
      feedback: found('feedback'),
      bug: found('bug'),
      idea: found('idea'),
      support: found('support'),
      contact: found('contact'),
      help: found('help'),
      report: found('report'),
    }).toEqual({
      feedback,
      bug: feedback,
      idea: feedback,
      support: feedback,
      contact: feedback,
      help: feedback,
      report: feedback,
    })
  })

  test('the Settings tab shows the tabs of the org settings, then the Account sections, with This Mac in the Mac app, and their pages in a search', () => {
    const tab = (overrides: Partial<PaletteSource>, text = '') =>
      paletteResults(query({ tab: 'settings', text }), source(overrides))
    const general = tab({}).groups[0]?.rows[0]
    const preferences = tab({}).groups[1]?.rows.find(
      (row) => row.key === 'account:new-workspaces',
    )
    expect({
      browser: shown(tab({})),
      mac: shown(tab({ mac: true }))[1],
      search: shown(tab({}, 'env')),
      generalOpens: general?.kind === 'command' ? general.href : null,
      preferencesOpens: preferences?.href,
    }).toEqual({
      browser: [
        [
          'Acme settings',
          ['General', 'Repositories', 'Cloud computer', 'Members'],
        ],
        ['Account', accountRows],
      ],
      mac: ['Account', [...accountRows, 'This Mac']],
      search: [['Acme settings', ['Cloud computer · Acme settings']]],
      generalOpens: routes.settings(acme.id, 'general'),
      preferencesOpens: routes.accountTab('preferences'),
    })
  })
})
