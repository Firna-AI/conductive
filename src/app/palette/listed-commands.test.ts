import { expect, test } from 'vitest'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { listedCommands } from './listed-commands'
import type { PaletteOffer } from './page-actions'
import type { PaletteBase } from './palette-source'
import { acme, firna, futex, source } from './results-test-kit'

test('the palette lists the command of each row: the offered actions, its own rows, a Switch to row by the place of its org in the rail, and Repositories settings', () => {
  const run = () => undefined
  const offers: PaletteOffer[] = [
    { scope: { kind: 'window' }, actions: [{ id: 'hide-sidebar', run }] },
    {
      scope: { kind: 'org', orgId: acme.id },
      actions: [{ id: 'new-section', run }],
    },
    {
      scope: { kind: 'workspace', workspaceId: 'open', name: 'Open' },
      actions: [
        { id: 'new-session', run },
        { id: 'go-to-desktop', run },
      ],
    },
  ]
  const deleted = {
    ...futex,
    deletion: { deletedAt: FAKE_TIME, deletesAt: FAKE_TIME + 1 },
  }
  const commands = (overrides: Partial<PaletteBase>) =>
    listedCommands(source(overrides)).map(({ command }) => command)
  expect({
    page: commands({ offers, openWorkspaceId: 'open' }),
    futex: commands({ org: futex }),
    deleted: commands({ orgs: [acme, deleted, firna] }),
    suspended: commands({ suspended: true }),
  }).toEqual({
    page: [
      'new-session',
      'new-workspace',
      'new-section',
      'create-org',
      'org-2',
      'org-3',
      'toggle-sidebar',
      'repositories-settings',
    ],
    futex: [
      'new-workspace',
      'create-org',
      'org-1',
      'org-3',
      'repositories-settings',
    ],
    deleted: ['new-workspace', 'create-org', 'org-3', 'repositories-settings'],
    suspended: ['create-org', 'org-2', 'org-3', 'repositories-settings'],
  })
})
