// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import {
  manySecrets,
  secretSearch,
} from '../../../docs/mockups/src/fixtures/secrets'
import {
  secretsPath,
  workspaceCapabilitiesPath,
  type OrgSecret,
} from '../../shared/secrets'
import { byLabel, byRole, queryByRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { secretFixtures } from '../../test-support/fixtures/secrets'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { openTab } from '../new-workspace/dialog-test-kit'
import { click, settle, typeText } from '../test-mount'
import { id, org } from '../workspace/kept-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { secrets, grants } = secretFixtures()

/**
 * The secrets of a larger org, as the Worker lists them: those of Acme,
 * then the eight more of the mockups, twelve in all.
 */
function manyOrgSecrets(): OrgSecret[] {
  const [first] = secrets
  if (!first) throw new Error('The fixtures have no secret.')
  const more = manySecrets.slice(secrets.length).map((item): OrgSecret => ({
    ...first,
    id: item.name.toLowerCase(),
    name: item.name,
    description: item.description,
    allAgents: false,
    lastReveal: null,
  }))
  return [...secrets, ...more]
}

/** Opens the Capabilities control of a workspace with these secrets. */
async function openControl(listed: readonly OrgSecret[]) {
  const server = new FakeApiServer()
  server.json('GET', secretsPath(org), { secrets: listed })
  server.json('GET', workspaceCapabilitiesPath(org, id), {
    capabilities: grants,
  })
  const tab = await openTab(server)
  click(byRole('button', 'Capabilities', tab.view))
  await settle()
  return byRole('dialog', 'Capabilities', tab.view)
}

/** The names of the listed secrets, in their order. */
function listed(control: HTMLElement): string[] {
  return Array.from(
    control.querySelectorAll('input[type="checkbox"]'),
    (box) => box.getAttribute('aria-label') ?? '',
  )
}

describe('the secrets in the Capabilities control', () => {
  test('a secret shows its description only in the info box of its info icon, which a press opens and closes, and the part has no hint line', async () => {
    const [first] = secrets
    if (!first) throw new Error('The fixtures have no secret.')
    const control = await openControl([
      ...secrets,
      { ...first, id: 'bare', name: 'BARE_TOKEN', description: '' },
    ])
    const info = byRole('button', 'About PROD_DATABASE_URL', control)
    const before = {
      hint: control.textContent?.includes('pre-approved secret with no'),
      text: control.textContent?.includes('Read-only replica'),
      bare: queryByRole('button', 'About BARE_TOKEN', control),
    }
    click(info)
    await settle()
    const box = control.querySelector('[role="tooltip"]')
    const open = {
      expanded: info.getAttribute('aria-expanded'),
      box: box?.textContent,
      controls: info.getAttribute('aria-controls') === box?.id,
      text: control.textContent?.includes('Read-only replica'),
    }
    click(info)
    await settle()
    expect({
      before,
      open,
      closed: control.textContent?.includes('Read-only replica'),
    }).toEqual({
      before: {
        hint: false,
        text: false,
        bare: null,
      },
      open: {
        expanded: 'true',
        box: 'Read-only replica of the production database.',
        controls: true,
        text: true,
      },
      closed: false,
    })
  })

  test('ten secrets or fewer get no search field', async () => {
    const control = await openControl(secrets)
    expect({
      search: queryByRole('textbox', 'Search secrets', control),
      listed: listed(control).length,
    }).toEqual({ search: null, listed: secrets.length })
  })

  test('more than ten secrets get a search, which narrows the list by name and description and keeps each check', async () => {
    const control = await openControl(manyOrgSecrets())
    const search = byLabel('Search secrets', control)
    typeText(search, secretSearch)
    await settle()
    const narrowed = listed(control)
    typeText(search, 'NPM')
    await settle()
    const byName = listed(control)
    typeText(search, 'nothing like this')
    await settle()
    const none = { listed: listed(control), text: control.textContent }
    typeText(search, '')
    await settle()
    const figma = byLabel('FIGMA_TOKEN', control)
    expect({
      narrowed,
      byName,
      none: none.listed,
      line: none.text?.includes('No secret matches “nothing like this”.'),
      all: listed(control).length,
      figma: figma instanceof HTMLInputElement && figma.checked,
    }).toEqual({
      narrowed: ['VERCEL_TOKEN', 'FLY_API_TOKEN', 'NETLIFY_TOKEN'],
      byName: ['NPM_TOKEN'],
      none: [],
      line: true,
      all: 12,
      figma: true,
    })
  })
})
