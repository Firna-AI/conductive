import { expect, test } from 'vitest'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { listedCommands } from './listed-commands'
import type { PaletteOffer } from './page-actions'
import { actionGroups } from './palette-groups'
import type { PaletteBase } from './palette-source'
import { acme, firna, futex, source } from './results-test-kit'

test('the palette lists the command of each row but Switch to org, which the rail runs, and a Switch to row shows the key of the place of its org in the rail', () => {
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
  // The command of each Switch to row, whose key the row shows.
  const switches = (overrides: Partial<PaletteBase>) =>
    actionGroups(source(overrides))
      .flatMap((group) => group.rows)
      .flatMap((row) =>
        row.kind === 'command' && row.lead.kind === 'org' ? [row.command] : [],
      )
  expect({
    page: commands({ offers, openWorkspaceId: 'open' }),
    futex: switches({ org: futex }),
    deleted: switches({ orgs: [acme, deleted, firna] }),
    suspended: commands({ suspended: true }),
  }).toEqual({
    page: [
      'new-session',
      'new-workspace',
      'new-section',
      'create-org',
      'toggle-sidebar',
      'repositories-settings',
      'keyboard-shortcuts',
    ],
    futex: ['org-1', 'org-3'],
    deleted: ['org-3'],
    suspended: ['create-org', 'repositories-settings', 'keyboard-shortcuts'],
  })
})
