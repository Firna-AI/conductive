// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import {
  secretsPath,
  workspaceCapabilitiesPath,
  type WorkspaceCapabilitiesResponse,
} from '../../shared/secrets'
import {
  byLabel,
  byRole,
  queryAllByRole,
  queryByRole,
} from '../../test-support/dom-queries'
import {
  secretRequestsPath,
  workspaceSecretValuePath,
} from '../../shared/secret-requests'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { priya } from '../../test-support/fixtures/secret-requests'
import { secretFixtures } from '../../test-support/fixtures/secrets'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { openTab } from '../new-workspace/dialog-test-kit'
import { click, press, settle } from '../test-mount'
import { bodiesOf, id, org } from '../workspace/kept-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { secrets, grants } = secretFixtures()
const path = workspaceCapabilitiesPath(org, id)
type Grants = WorkspaceCapabilitiesResponse['capabilities']

/** The fake API with the secrets of Acme and the grants of the workspace. */
function capabilitiesServer(server: FakeApiServer): FakeApiServer {
  server.json('GET', secretsPath(org), { secrets })
  server.json('GET', path, { capabilities: grants })
  return server
}

/** The answer of the next change: the whole capabilities after it. */
function answerWith(server: FakeApiServer, capabilities: Grants): void {
  server.json('PATCH', path, { capabilities })
}

/** The text of each approval of a session, with its secret first. */
function approvals(control: HTMLElement): string[] {
  return Array.from(control.querySelectorAll('li'), (row) =>
    Array.from(row.firstElementChild?.children ?? [], (part) =>
      (part.textContent ?? '').trim(),
    ).join(' | '),
  )
}

function checked(control: HTMLElement, name: string): boolean {
  const box = byLabel(name, control)
  return box instanceof HTMLInputElement && box.checked
}

describe('the Capabilities control of a workspace', () => {
  test('a member who is not an admin sees the approvals of this session, and changes a pre-approval and an approval', async () => {
    const server = capabilitiesServer(new FakeApiServer({ role: 'member' }))
    const tab = await openTab(server)
    click(byRole('button', 'Capabilities', tab.view))
    await settle()
    const control = byRole('dialog', 'Capabilities', tab.view)
    // VERCEL_TOKEN is allowed in another session, so it does not show here.
    const replicaRow = 'PROD_DATABASE_URL | Allowed by Cal, 1 hour ago'
    expect({
      approvals: approvals(control),
      figma: checked(control, 'FIGMA_TOKEN'),
      replica: checked(control, 'PROD_DATABASE_URL'),
    }).toEqual({ approvals: [replicaRow], figma: true, replica: false })
    const from = server.requests.length
    const preapproved = ['figma-token', 'prod-database-url']
    answerWith(server, { ...grants, preapprovedSecretIds: preapproved })
    click(byLabel('PROD_DATABASE_URL', control))
    await settle()
    // The pre-approval covers the approval of the session, which hides.
    const covered = approvals(control)
    answerWith(server, grants)
    click(byLabel('PROD_DATABASE_URL', control))
    await settle()
    const uncovered = approvals(control)
    const [, other] = grants.sessionApprovals
    const left = { ...grants, sessionApprovals: other ? [other] : [] }
    answerWith(server, left)
    click(
      byRole('button', 'Remove PROD_DATABASE_URL from this session', control),
    )
    await settle()
    expect({
      sent: await bodiesOf(server, 'PATCH', path, from),
      covered,
      uncovered,
      approvals: approvals(control),
    }).toEqual({
      sent: [
        { preapprovedSecretIds: preapproved },
        { preapprovedSecretIds: ['figma-token'] },
        {
          removeSessionApprovals: [
            { secretId: 'prod-database-url', sessionId: 'autocomplete' },
          ],
        },
      ],
      covered: [],
      uncovered: [replicaRow],
      approvals: [],
    })
  })

  test('another session shows its own approvals, and no approval of a secret for all agents', async () => {
    const server = capabilitiesServer(new FakeApiServer())
    const [, vercel] = grants.sessionApprovals
    const sentry = secrets.find((secret) => secret.allAgents)
    const covered = vercel && sentry ? [{ ...vercel, secretId: sentry.id }] : []
    server.json('GET', path, {
      capabilities: {
        ...grants,
        sessionApprovals: [...grants.sessionApprovals, ...covered],
      },
    })
    const tab = await openTab(server, {
      at: routes.session(org, id, 'debounce'),
    })
    click(byRole('button', 'Capabilities', tab.view))
    await settle()
    const control = byRole('dialog', 'Capabilities', tab.view)
    expect({ covered: covered.length, approvals: approvals(control) }).toEqual({
      covered: 1,
      approvals: ['VERCEL_TOKEN | Allowed by Priya Raman, yesterday'],
    })
  })

  test('the workspace pre-loads its Capabilities, so the control shows them as it opens and reads them again behind them', async () => {
    const server = capabilitiesServer(new FakeApiServer())
    const tab = await openTab(server)
    await settle()
    const reads = () =>
      server.requests.filter(
        (item) => item.method === 'GET' && new URL(item.url).pathname === path,
      ).length
    const before = reads()
    click(byRole('button', 'Capabilities', tab.view))
    const control = byRole('dialog', 'Capabilities', tab.view)
    const shown = checked(control, 'FIGMA_TOKEN')
    await settle()
    expect({ before, shown, after: reads() }).toEqual({
      before: 1,
      shown: true,
      after: 2,
    })
  })

  test('on a phone, one More options button holds Attach files and Capabilities, Capabilities opens as a sheet, and Stop shows only its icon', async () => {
    const server = capabilitiesServer(
      new FakeApiServer({ conversation: 'running' }),
    )
    const tab = await openTab(server, { viewport: 'phone' })
    const stop = queryByRole('button', 'Stop', tab.view)
    expect({
      attach: queryAllByRole('button', 'Attach files', tab.view).length,
      more: queryByRole('button', 'More options', tab.view) !== null,
      stop: { text: stop?.textContent, name: stop?.getAttribute('aria-label') },
    }).toEqual({ attach: 0, more: true, stop: { text: '', name: 'Stop' } })
    click(byRole('button', 'More options', tab.view))
    const menu = queryByRole('menu', 'More options', tab.view)
    expect(
      Array.from(
        menu?.querySelectorAll('[role="menuitem"]') ?? [],
        (item) => item.textContent,
      ),
    ).toEqual(['Attach files', 'Capabilities'])
    click(byRole('menuitem', 'Capabilities', tab.view))
    await settle()
    const sheet = queryByRole('dialog', 'Capabilities')
    expect({
      menu: queryByRole('menu', 'More options', tab.view),
      // A sheet is modal, and the popover of a computer is not.
      sheet: sheet?.getAttribute('aria-modal'),
      figma: sheet ? checked(sheet, 'FIGMA_TOKEN') : null,
    }).toEqual({ menu: null, sheet: 'true', figma: true })
    // Escape closes the sheet, and the focus goes back to the + button.
    if (sheet) press(sheet, 'Escape')
    await settle()
    expect({
      sheet: queryByRole('dialog', 'Capabilities'),
      focus: document.activeElement?.getAttribute('aria-label'),
    }).toEqual({ sheet: null, focus: 'More options' })
  })

  test.each([
    {
      saved: 'saved secrets',
      savedSecrets: secrets,
      capabilities: grants,
      approvalGroups: ['This session'],
    },
    {
      saved: 'no saved secrets',
      savedSecrets: [],
      capabilities: {
        ...grants,
        preapprovedSecretIds: [],
        sessionApprovals: [],
      },
      approvalGroups: [],
    },
  ])(
    'lists and removes each workspace value with $saved',
    async ({ savedSecrets, capabilities, approvalGroups }) => {
      const server = capabilitiesServer(new FakeApiServer())
      server.json('GET', secretsPath(org), { secrets: savedSecrets })
      server.json('GET', path, { capabilities })
      server.json('GET', secretRequestsPath(org, id), {
        requests: [],
        workspaceValues: [
          {
            id: 'value-1',
            name: 'MAPBOX_TOKEN',
            suppliedBy: priya,
            createdAt: FAKE_TIME - 3 * 3_600_000,
          },
        ],
      })
      const valuePath = workspaceSecretValuePath(org, id, 'value-1')
      server.empty('DELETE', valuePath)
      const tab = await openTab(server)
      click(byRole('button', 'Capabilities', tab.view))
      await settle()
      const control = byRole('dialog', 'Capabilities', tab.view)
      const groups = () =>
        Array.from(control.querySelectorAll('h4'), (title) => title.textContent)
      expect({ rows: approvals(control).at(-1), groups: groups() }).toEqual({
        rows: 'MAPBOX_TOKEN | Given by Priya Raman, 3 hours ago',
        groups: [...approvalGroups, 'Values for this workspace'],
      })
      const from = server.requests.length
      click(byRole('button', 'Remove the value of MAPBOX_TOKEN', control))
      await settle()
      expect({
        removed: server.requests
          .slice(from)
          .map((item) => `${item.method} ${new URL(item.url).pathname}`),
        after: groups(),
      }).toEqual({
        removed: [`DELETE ${valuePath}`],
        after: approvalGroups,
      })
    },
  )
})
